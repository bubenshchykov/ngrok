console.error('ngrok - Downloading newest binary...');

var os = require('os');
var https = require('https');
var fs = require('fs');
var util = require('util');
var DecompressZip = require('decompress-zip');

var files = {
	darwinia32: 'https://api.equinox.io/1/Applications/ap_pJSFC5wQYkAyI0FIVwKYs9h1hW/Updates/Asset/ngrok.zip?os=darwin&arch=386&channel=stable',
	darwinx64: 'https://api.equinox.io/1/Applications/ap_pJSFC5wQYkAyI0FIVwKYs9h1hW/Updates/Asset/ngrok.zip?os=darwin&arch=amd64&channel=stable',
	linuxarm: 'https://api.equinox.io/1/Applications/ap_pJSFC5wQYkAyI0FIVwKYs9h1hW/Updates/Asset/ngrok.zip?os=linux&arch=arm&channel=stable',
	linuxia32: 'https://api.equinox.io/1/Applications/ap_pJSFC5wQYkAyI0FIVwKYs9h1hW/Updates/Asset/ngrok.zip?os=linux&arch=386&channel=stable',
	linuxx64: 'https://api.equinox.io/1/Applications/ap_pJSFC5wQYkAyI0FIVwKYs9h1hW/Updates/Asset/ngrok.zip?os=linux&arch=amd64&channel=stable',
	win32ia32: 'https://api.equinox.io/1/Applications/ap_pJSFC5wQYkAyI0FIVwKYs9h1hW/Updates/Asset/ngrok.zip?os=windows&arch=386&channel=stable',
	win32x64: 'https://api.equinox.io/1/Applications/ap_pJSFC5wQYkAyI0FIVwKYs9h1hW/Updates/Asset/ngrok.zip?os=windows&arch=amd64&channel=stable',
	freebsdia32: 'https://api.equinox.io/1/Applications/ap_pJSFC5wQYkAyI0FIVwKYs9h1hW/Updates/Asset/ngrok.zip?os=freebsd&arch=386&channel=stable',
	freebsdx64: 'https://api.equinox.io/1/Applications/ap_pJSFC5wQYkAyI0FIVwKYs9h1hW/Updates/Asset/ngrok.zip?os=freebsd&arch=amd64&channel=stable'
};

var path = __dirname + '/bin/';
if (!fs.existsSync(path)) {
	fs.mkdirSync(path);
}

var zip = fs.createWriteStream(path + 'ngrok.zip');
var which = os.platform() + os.arch();
https.get(files[which], function(response) {
	response.pipe(zip).on('finish', function() {
		console.error('ngrok - Zipfile received (' + files[which] + ') ...');
		unzipFile(path + 'ngrok.zip');
	});
});

function unzipFile(file) {
	var suffix = os.platform() === 'win32' ? '.exe' : '';
	var unzipper = new DecompressZip(file);
	unzipper.extract({ path: path });
	unzipper.once('error', function(e) {
		console.error(e);
		process.exit(1);
	});
	unzipper.once('extract', function(log) {
		if (suffix === '.exe') {
			fs.writeFileSync(path + 'ngrok.cmd', 'ngrok.exe');
		}
		fs.unlinkSync(path + 'ngrok.zip');
		var target = path + 'ngrok' + suffix;
		fs.chmodSync(target, 0755);
		if (fs.existsSync(target) && fs.statSync(target).size > 0) {
			console.error('ngrok - Binary downloaded.');
			return;
		}
		console.error('ngrok - Binary NOT downloaded.');
		process.exit(-1);
	});
};
