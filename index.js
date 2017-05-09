var request = require('request');
var spawn = require('child_process').spawn;
var Emitter = require('events').EventEmitter;
var platform = require('os').platform();
var lock = require('lock')();
var async = require('async');
var uuid = require('uuid');
var url = require('url');

var bin = './ngrok' + (platform === 'win32' ? '.exe' : '');
var ready = /starting web service.*addr=(\d+\.\d+\.\d+\.\d+:\d+)/;
var inUse = /address already in use/;

var noop = function() {};
var emitter = new Emitter().on('error', noop);
var ngrok, api, tunnels = {};

function connect(opts, cb) {

	if (typeof opts === 'function') {
		cb = opts;
	}

	cb = cb || noop;
	opts = defaults(opts);
	var optsError = validate(opts);

	if (optsError) {
		emitter.emit('error', optsError);
		return cb(optsError);
	}

	if (api) {
		return runTunnel(opts, cb);
	}

	lock('ngrok', function(release) {
		function run(err) {
			if (err) {
				emitter.emit('error', err);
				return cb(err);
			}
			runNgrok(opts, release(function(err) {
				if (err) {
					emitter.emit('error', err);
					return cb(err);
				}
				runTunnel(opts, cb)
			}));
		}

		opts.authtoken ?
			authtoken(opts.authtoken, run, opts.configPath) :
			run(null);

	});
}

function defaults(opts) {
	opts = opts || {proto: 'http', addr: 80};

	if (typeof opts === 'function') {
		opts = {proto: 'http', addr: 80};
	}

	if (typeof opts !== 'object') {
		opts = {proto: 'http', addr: opts};
	}

	if (!opts.proto) {
		opts.proto = 'http';
	}

	if (!opts.addr) {
		opts.addr = opts.port || opts.host || 80;
	}

	if (opts.httpauth) {
		opts.auth = opts.httpauth;
	}

	if (['us', 'eu', 'au', 'ap'].indexOf(opts.region) === -1) {
		opts.region = 'us';
	}

	return opts;
}

function validate(opts) {
	if (opts.web_addr === false || opts.web_addr === 'false') {
		return new Error('web_addr:false is not supported, module depends on internal ngrok api');
	}
	return false;
}


function runNgrok(opts, cb) {
	if (api) {
		return cb();
	}

	var start = ['start', '--none', '--log=stdout', '--region=' + opts.region];
	if (opts.configPath) {
		start.push('--config=' + opts.configPath);
	}

	ngrok = spawn(
			bin,
			start,
			{cwd: __dirname + '/bin'});


	ngrok.stdout.on('data', function (data) {
		var msg = data.toString();
		var addr = msg.match(ready);
		if (addr) {
			api = request.defaults({
				baseUrl: 'http://' + addr[1],
				json: true
			});
			done();
		} else if (msg.match(inUse)) {
			done(new Error(msg.substring(0, 10000)));
		}
	});

	ngrok.stderr.on('data', function (data) {
		var info = data.toString().substring(0, 10000);
		done(new Error(info));
	});


	function done(err) {
		ngrok.stdout.removeAllListeners('data');
		ngrok.stderr.removeAllListeners('data');
		cb(err);
	}

	ngrok.on('close', function () {
		return emitter.emit('close');
	});

	process.on('exit', function() {
		kill();
	});
}

function runTunnel(opts, cb) {
	_runTunnel(opts, function(err, publicUrl, uiUrl) {
		if (err) {
			emitter.emit('error', err);
			return cb(err);
		}
		emitter.emit('connect', publicUrl, uiUrl);
		return cb(null, publicUrl, uiUrl);
	});
}

function _runTunnel(opts, cb) {
	var retries = 100;
	opts.name = String(opts.name || uuid.v4());
	var retry = function() {
		api.post(
			{url: 'api/tunnels', json: opts},
			function(err, resp, body) {
				if (err) {
					return cb(err);
				}
				var notReady = resp.statusCode === 500 && /panic/.test(body) ||
					resp.statusCode === 502 && body.details &&
						body.details.err === 'tunnel session not ready yet';

				if (notReady) {
					return retries-- ?
						setTimeout(retry, 200) :
						cb(new Error(body));
				}
				var publicUrl = body && body.public_url;
				if (!publicUrl) {
					var err = Object.assign(new Error(body.msg || 'failed to start tunnel'), body);
					return cb(err);
				}
				tunnels[publicUrl] = body.uri;
				if (opts.proto === 'http' && opts.bind_tls !== false) {
					tunnels[publicUrl.replace('https', 'http')] = body.uri + ' (http)';
				}
				var uiUrl = url.parse(resp.request.uri);
				uiUrl = uiUrl.resolve('/').slice(0, -1);
				return cb(null, publicUrl, uiUrl);
			});
	};

	retry();
}

function authtoken(token, cb, configPath) {
	cb = cb || noop;
	var authtoken = ['authtoken', token];
	if (configPath) {
		authtoken.push('--config=' + configPath);
	}
	var a = spawn(
		bin,
		authtoken,
		{cwd: __dirname + '/bin'});
	a.stdout.once('data', done.bind(null, null, token));
	a.stderr.once('data', done.bind(null, new Error('cant set authtoken')));

	function done(err, token) {
		cb(err, token);
		a.kill();
	}
}

function disconnect(publicUrl, cb) {
	cb = cb || noop;
	if (typeof publicUrl === 'function') {
		cb = publicUrl;
		publicUrl = null;
	}
	if (!api) {
		return cb();
	}
	if (publicUrl) {
		return api.del(
			tunnels[publicUrl],
			function(err, resp, body) {
				if (err || resp.statusCode !== 204) {
					return cb(err || new Error(body));
				}
				delete tunnels[publicUrl];
				emitter.emit('disconnect', publicUrl);
				return cb();
			});
	}

	return async.each(
		Object.keys(tunnels),
		disconnect,
		function(err) {
			if (err) {
				emitter.emit('error', err);
				return cb(err);
			}
			emitter.emit('disconnect');
			return cb();
		});
}

function kill(cb) {
	cb = cb || noop;
	if (!ngrok) {
		return cb();
	}
	ngrok.on('exit', function() {
		api = null;
		tunnels = {};
		emitter.emit('disconnect');
		return cb();
	});
	return ngrok.kill();
}

emitter.connect = connect;
emitter.disconnect = disconnect;
emitter.authtoken = authtoken;
emitter.kill = kill;

module.exports = emitter;
