var os = require('os');
var spawn = require('child_process').spawn;
var EventEmitter = require('events').EventEmitter;
var ngrokTunnels = {};
var eventEmitter = new EventEmitter();
var exports = {};

function connect(opts, fn) {

	if (typeof opts === 'number') {
		opts = {log: false, port: opts};
	}

	var error = validateOpts(opts);
	if (error) {
		if(fn) fn(error);
		return eventEmitter.emit('error', error);
	}

	var tunnelUrl;
	var ngrokBin = getNgrokBin();
	var ngrokArgs = getNgrokArgs(opts);
	var ngrok = spawn('./' + ngrokBin, ngrokArgs, {cwd: __dirname + '/bin'});

	ngrok.stdout.on('data', function (data) {
		var urlMatch = data.toString().match(/\[INFO\] \[client\] Tunnel established at ((tcp|https)..*.ngrok.com(:[0-9]+)?)/);
		if (urlMatch && urlMatch[1]) {
			tunnelUrl = urlMatch[1];
			ngrokTunnels[tunnelUrl] = ngrok;
			log('ngrok: tunnel established at ' + tunnelUrl);
			fn && fn(null, tunnelUrl);
			return eventEmitter.emit('connect', tunnelUrl);
		}
		var urlBusy = data.toString().match(/\[EROR\] \[client\] Server failed to allocate tunnel: The tunnel ((tcp|http|https)..*.ngrok.com([0-9]+)?) (.*is already registered)/);
		if (urlBusy && urlBusy[1]) {
			ngrok.kill();
			var info = 'ngrok: The tunnel ' + urlBusy[1] + ' ' + urlBusy[4];
			var err = new Error(info);
			log(info);
			return fn(err);
		}
	});

	ngrok.stderr.on('data', function (data) {
		ngrok.kill();
		var info = 'ngrok: process exited due to error\n' + data.toString().substring(0, 10000);
		var err = new Error(info);
		log(info);
		fn && fn(err);
		return eventEmitter.emit('error', err);
	});

	ngrok.on('close', function () {
		var tunnelInfo = tunnelUrl ? tunnelUrl + ' ' : '';
		log('ngrok: ' + tunnelInfo + 'disconnected');
		eventEmitter.emit('close');
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
	if(tunnelUrl) {
		return killNgrok(tunnelUrl, callback);
	}
	var pending = 1;
	Object.keys(ngrokTunnels).forEach(function(host) {
		pending++;
		killNgrok(host, next);
	});
	process.nextTick(next); // ensure we get at least one tick.
	
	function next() {
		if (--pending === 0) callback && callback();
	}
}

function killNgrok(tunnelUrl, callback) {
	var ngrok = ngrokTunnels[tunnelUrl];
	delete ngrokTunnels[tunnelUrl];
	if (!ngrok) { // don't wait for exit if its not in the object
		return callback && process.nextTick(callback);
	}
	ngrok.once('exit', function() { // verify we actually killed it...
		eventEmitter.emit('disconnect');  
		return callback && callback();
	});
	ngrok.kill();
	return;
}

for( var key in eventEmitter ) {
	exports[key] = eventEmitter[key];
}

exports.connect = connect;
exports.disconnect = disconnect;

module.exports = exports;
