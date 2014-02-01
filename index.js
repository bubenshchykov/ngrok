var spawn = require('child_process').spawn;
var path = require('path');
var ngrokTunnels = {};

function connect(opts, fn) {
	
	if (typeof opts === 'number') {
		opts = {log: false, port: opts};
	}

	var error = validateOpts(opts);
	if (error) {
		return fn(error);
	}

	var tunnelUrl;
	var ngrokBin = getNgrokBin();
	var ngrokArgs = getNgrokArgs(opts);
	var ngrok = spawn('./' + ngrokBin, ngrokArgs, {cwd: __dirname + '/bin'});

	ngrok.stdout.on('data', function (data) {
		var urlMatch = data.toString().match(/Tunnel established at ((tcp|https)..*.ngrok.com(:[0-9]+)?)/);
		if (urlMatch && urlMatch[1]) {
			tunnelUrl = urlMatch[1];
			ngrokTunnels[tunnelUrl] = ngrok;
			log('ngrok: tunnel established at ' + tunnelUrl);
			return fn(null, tunnelUrl);
		}

	});

	ngrok.stderr.on('data', function (data) {
		ngrok.kill();
		var info = 'ngrok: process exited due to error\n' + data.toString().substring(0, 10000);
		var err = new Error(info);
		log(info);
		return fn(err);
	});

	ngrok.on('close', function () {
		var tunnelInfo = tunnelUrl ? tunnelUrl + ' ' : '';
		log('ngrok: ' + tunnelInfo + 'disconnected');
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
	var bins = {
		darwin: 'ngrok-darwin',
		linux: 'ngrok-linux',
		win32: 'ngrok-win32.exe'
	};
	return bins[process.platform] || bins.linux;
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
	} else {
		var pending = 1;
		function next() {
			if (--pending === 0) callback && callback();
		}
		Object.keys(ngrokTunnels).forEach(function(host) {
			pending++;
			killNgrok(host, next);
		});
		// ensure we get at least one tick.
		process.nextTick(next);
	}
}

function killNgrok(tunnelUrl, callback) {
	var ngrok = ngrokTunnels[tunnelUrl];
	delete ngrokTunnels[tunnelUrl];
	// don't wait for exit if its not in the object
	if (!ngrok) return callback && process.nextTick(callback);
	// verify we actually killed it...
	ngrok.once('exit', function() {
		callback();
	});
	ngrok.kill();
	return;
}

module.exports = {
	connect: connect,
	disconnect: disconnect
};
