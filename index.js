var os = require('os');
var spawn = require('child_process').spawn;
var EventEmitter = require('events').EventEmitter;

var emitter = new EventEmitter();
var tunnels = {};
var exports = {};

var TUNNEL_OK = /\[INFO\] \[client\] Tunnel established at ((tcp|https)..*.ngrok.com(:[0-9]+)?)/;
var TUNNEL_BUSY = /\[EROR\] \[client\] Server failed to allocate tunnel: The tunnel ((tcp|http|https)..*.ngrok.com([0-9]+)?) (.*is already registered)/;

function connect(opts, cb) {

	cb || (cb = function(){});
	if (typeof opts === 'number') {
		opts = {log: false, port: opts};
	}

	var error = validateOpts(opts);
	if (error) {
		cb(error);
		return emitter.emit('error', error);
	}

	var tunnelUrl;
	var ngrok = spawn('./' + getNgrokBin(), getNgrokArgs(opts), {cwd: __dirname + '/bin'});

	ngrok.stdout.on('data', function (data) {
		var urlOk = data.toString().match(TUNNEL_OK);
		if (urlOk && urlOk[1]) {
			tunnelUrl = urlOk[1];
			tunnels[tunnelUrl] = ngrok;
			log('ngrok: tunnel established at ' + tunnelUrl);
			cb(null, tunnelUrl);
			return emitter.emit('connect', tunnelUrl);
		}
		var urlBusy = data.toString().match(TUNNEL_BUSY);
		if (urlBusy && urlBusy[1]) {
			ngrok.kill();
			var info = 'ngrok: The tunnel ' + urlBusy[1] + ' ' + urlBusy[4];
			var err = new Error(info);
			log(info);
			return cb(err);
		}
	});

	ngrok.stderr.on('data', function (data) {
		ngrok.kill();
		var info = 'ngrok: process exited due to error\n' + data.toString().substring(0, 10000);
		var err = new Error(info);
		log(info);
		cb(err);
		return emitter.emit('error', err);
	});

	ngrok.on('close', function () {
		var tunnelInfo = tunnelUrl ? tunnelUrl + ' ' : '';
		log('ngrok: ' + tunnelInfo + 'disconnected');
		return emitter.emit('close');
	});

	function log(message) {
		opts.log && console.log(message);
	}
}

function validateOpts (opts) {
	if (!opts.port) {
		return new Error('port not specified');
	}
	if (opts.start || opts.hostname) {
		return new Error('starting multiple ngrok clients or using hostname option is not supported yet');
	}
	if ((opts.subdomain || opts.httpauth || opts.proto) && !opts.authtoken) {
		return new Error('authtoken should be specified to use signup features: subdomain|httpauth|proto');
	}
	return false;
}

function getNgrokBin () {
	var suffix = os.platform() === 'win32' ? '.exe' : '';
	return 'ngrok' + suffix;
}

function getNgrokArgs(opts) {
	var args = ['-log=stdout'];
	opts.authtoken && args.push('-authtoken', opts.authtoken);
	opts.subdomain && args.push('-subdomain', opts.subdomain);
	opts.httpauth && args.push('-httpauth', opts.httpauth);
	opts.proto && args.push('-proto', opts.proto);
	args.push(opts.port);
	return args;
}

function disconnect(tunnelUrl, callback) {
	if (typeof tunnelUrl === 'function') {
		callback = tunnelUrl;
		tunnelUrl = null;
	}
	if (tunnelUrl) {
		return kill(tunnelUrl, callback);
	}
	var pending = 1;
	Object.keys(tunnels).forEach(function(url) {
		pending++;
		kill(url, next);
	});
	process.nextTick(next);
	
	function next() {
		if (--pending === 0) callback && callback();
	}
}

function kill(tunnelUrl, callback) {
	var ngrok = tunnels[tunnelUrl];
	delete tunnels[tunnelUrl];
	if (!ngrok) {
		return callback && process.nextTick(callback);
	}
	ngrok.once('exit', function() {
		emitter.emit('disconnect');  
		return callback && callback();
	});
	return ngrok.kill();
}

for(var key in emitter ) {
	exports[key] = emitter[key];
}
exports.connect = connect;
exports.disconnect = disconnect;

module.exports = exports;
