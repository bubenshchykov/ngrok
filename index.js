/* exposes localhost to the web via ngrok

usage:
	require('ngrok').connect(function (url) {
		console.log('got nkgro url', url);
	});

see http://127.0.0.1:4040/http/in to view the webhooks
see https://ngrok.com/ for details
*/

var spawn = require('child_process').spawn;
var path = require('path');

function connect(opts, fn) {

	var ngrokBin = getNgrokBin();
	var ngrok = spawn(ngrokBin, ['-log=stdout', 8080], {cwd: './bin'});

	ngrok.stdout.on('data', function (data) {
		var urlMatch = data.toString().match(/Tunnel established at (https..*.ngrok.com)/);
		if (urlMatch && urlMatch[1]) {
			tunnelUrl = urlMatch[1];
			return fn(null, tunnelUrl);
		}

	});

	ngrok.stderr.on('data', function (data) {
		ngrok.kill();
		var err = new Error('ngrok: process exited due to error', data.toString().substring(0, 10000));
		return fn(err);
	});

	ngrok.on('close', function (code) {
		var err = new Error('ngrok: process exited with a code ' + code);
		return fn(err);
	});
}

function getNgrokBin () {
	var bins = {
		darwin: 'ngrok-darwin',
		linux: 'ngrok-linux',
		win32: 'ngrok-win32.exe'
	};
	return bins[process.platform] || bins.linux;
}

module.exports = {
	connect: connect
};