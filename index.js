var request = require('request');
var spawn = require('child_process').spawn;
var Emitter = require('events').EventEmitter;
var platform = require('os').platform();
var lock = require('lock')();
var async = require('async');


var bin = './ngrok' + (platform === 'win32' ? '.exe' : '');
var ready = /starting web service.*addr=(\d+\.\d+\.\d+\.\d+:\d+)/;

var noop = function() {};
var emitter = new Emitter().on('error', noop);
var ngrok, api, tunnels = {}, id = 0;

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
		runNgrok(opts, release(function(err) {
			if (err) {
				emitter.emit('error', err);
				return cb(err);
			}
			runTunnel(opts, cb)
		}));
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

	return opts;
}

function runNgrok(opts, cb) {
	if (api) {
		return cb();
	}
	
	ngrok = spawn(
			bin,
			['start', '--none', '--log=stdout'],
			{cwd: __dirname + '/bin'});
	
	ngrok.stdout.on('data', function (data) {
		var addr = data.toString().match(ready);
		if (addr) {
			api = request.defaults({
				baseUrl: 'http://' + addr[1] + '/api',
				json: true
			});
			cb();
		}
	});

	ngrok.stderr.once('data', function (data) {
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
	var retries = 200;

	opts.name = opts.name || String(id++);
	
	var retry = function() {
		console.log(retries);
		api.post(
			{url: '/tunnels', json: opts},
			function(err, resp, body) {
				if (err) {
					return cb(err);
				}
				var notReady = resp.statusCode === 500;
				if (notReady) {
					return retries-- ?
						setTimeout(retry, 100) :
						cb(new Error(body));
				}
				var url = body && body.public_url;
				if (!url) {
					var err = new Error(JSON.stringify(body));
					return cb(err);
				}
				tunnels[url] = body.name;
				return cb(null, url);
			});
	};

	if (opts.authtoken) {
		return authtoken(opts.authtoken, retry);
	}

	retry();	
}

function authtoken(token, cb) {
	var a = spawn(
		bin,
		['authtoken', token],
		{cwd: __dirname + '/bin'});
	a.stdout.once('data', cb);
	a.stderr.once('data', cb);
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
			'tunnels/' + tunnels[url],
			function(err, resp, body) {
				if (err || resp.statusCode !== 204) {
					return cb(err || new Error(body));
				}
				delete tunnels[url];
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
		emitter.emit('disconnect');
		return cb();
	});
	return ngrok.kill();
}

var exports = {
	connect: connect,
	disconnect: disconnect,
	kill: kill
};

for(var key in emitter) {
	exports[key] = emitter[key];
}

module.exports = exports;
