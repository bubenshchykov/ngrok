var request = require('request');
var spawn = require('child_process').spawn;
var Emitter = require('events').EventEmitter;
var platform = require('os').platform();
var lock = require('lock')();
var async = require('async');
var uuid = require('uuid');
var xtend = require('xtend');

var bin = './ngrok' + (platform === 'win32' ? '.exe' : '');
var ready = /starting web service.*addr=(\d+\.\d+\.\d+\.\d+:\d+)/;

var noop = function() {};
var emitter = new Emitter().on('error', noop);
var ngrok, api, tunnels = {};

function connect(opts, cb) {

	if (typeof opts === 'function') {
		cb = opts;
	}

	cb = cb || noop;
	opts = defaults(opts);

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
			authtoken(opts.authtoken, run) :
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

function runNgrok(opts, cb) {
	if (api) {
		return cb();
	}
	
	ngrok = spawn(
			bin,
			['start', '--none', '--log=stdout', '--region=' + opts.region],
			{cwd: __dirname + '/bin'});
	
	ngrok.stdout.on('data', function (data) {
		var addr = data.toString().match(ready);
		if (addr) {
			api = request.defaults({
				baseUrl: 'http://' + addr[1],
				json: true
			});
			cb();
		}
	});

	ngrok.stderr.on('data', function (data) {
		var info = data.toString().substring(0, 10000);
		return cb(new Error(info));
	});

	ngrok.on('close', function () {
		return emitter.emit('close');
	});

	process.on('exit', function() {
		kill();
	});
}

function runTunnel(opts, cb) {
	_runTunnel(opts, function(err, url) {
		if (err) {
			emitter.emit('error', err);
			return cb(err);
		}
		emitter.emit('connect', url);
		return cb(null, url);
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
				var url = body && body.public_url;
				if (!url) {
					var err = xtend(new Error(body.msg || 'failed to start tunnel'), body);
					return cb(err);
				}
				tunnels[url] = body.uri;
				if (opts.proto === 'http' && opts.bind_tls !== false) {
					tunnels[url.replace('https', 'http')] = body.uri + ' (http)';
				}
				return cb(null, url);
			});
	};

	retry();	
}

function authtoken(token, cb) {
	cb = cb || noop;
	var a = spawn(
		bin,
		['authtoken', token],
		{cwd: __dirname + '/bin'});
	a.stdout.once('data', done.bind(null, null, token));
	a.stderr.once('data', done.bind(null, new Error('cant set authtoken')));

	function done(err, token) {
		cb(err, token);
		a.kill();
	}
}

function disconnect(url, cb) {
	cb = cb || noop;
	if (typeof url === 'function') {
		cb = url;
		url = null;
	}
	if (!api) {
		return cb();
	}
	if (url) {
		return api.del(
			tunnels[url],
			function(err, resp, body) {
				if (err || resp.statusCode !== 204) {
					return cb(err || new Error(body));
				}
				delete tunnels[url];
				emitter.emit('disconnect', url);
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
