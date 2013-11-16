/* exposes localhost to the web via ngrok

usage:
	var ngrok = require('ngrok');
	ngrok.connect({port: 80, log: true}, function (url) {
		console.log('got nkgro url', url);
	});
	ngrok.disconnect();

see http://127.0.0.1:4040/http/in to view the webhooks
see https://ngrok.com/ for details
*/

var spawn = require('child_process').spawn;
var path = require('path');

var port = 80;
var ngrokTunnels = {};

function connect(opts, fn) {

	opts || (opts = {});
	fn || (fn = function() {});

	if (ngrok) {
		return;
	}

	var tunnelUrl;
	var ngrokBin = getNgrokBin();
	var ngrok = spawn(ngrokBin, ['-log=stdout', opts.port || port], {cwd: './bin'});

	ngrok.stdout.on('data', function (data) {
		var urlMatch = data.toString().match(/Tunnel established at (https..*.ngrok.com)/);
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

function getNgrokBin () {
	var bins = {
		darwin: 'ngrok-darwin',
		linux: 'ngrok-linux',
		win32: 'ngrok-win32.exe'
	};
	return bins[process.platform] || bins.linux;
}

function disconnect(tunnelUrl) {
	if(tunnelUrl) {
		return killNgrok(tunnelUrl);
	} else {
		return Object.keys(ngrokTunnels).forEach(killNgrok);
	}
}

function killNgrok(tunnelUrl) {
	var ngrok = ngrokTunnels[tunnelUrl];
	ngrok && ngrok.kill();
	delete ngrokTunnels[tunnelUrl];
	return;
}

module.exports = {
	connect: connect,
	disconnect: disconnect
};