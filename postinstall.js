console.error('ngrok - downloading newest binary...');

var os = require('os');
var fs = require('fs');
var util = require('util');
var https = require('https');
var DecompressZip = require('decompress-zip');

var cdn = process.env.npm_config_ngrok_cdnurl ||
	process.env.NGROK_CDNURL ||
	'https://bin.equinox.io/a/bZszyrZZM3G';

var files = {
	darwinia32:	'https://bin.equinox.io/a/hU5xF8ZzQgp/ngrok-2.1.1-darwin-386.zip',
	darwinx64:	'https://bin.equinox.io/a/bZszyrZZM3G/ngrok-2.1.1-darwin-amd64.zip',
	linuxarm:	'https://bin.equinox.io/a/e7Ywipw6GyW/ngrok-2.1.1-linux-arm.tar.gz',
	linuxia32:	'https://bin.equinox.io/a/4vkGbFY6yNM/ngrok-2.1.1-linux-386.tar.gz',
	linuxx64:	'https://bin.equinox.io/a/b87faFPKrii/ngrok-2.1.1-linux-amd64.tar.gz',
	win32ia32:	'https://bin.equinox.io/a/54cQjE1obr2/ngrok-2.1.1-windows-386.zip',
	win32x64:	'https://bin.equinox.io/a/chRZWPptE7w/ngrok-2.1.1-windows-amd64.zip',
	freebsdia32:	'https://bin.equinox.io/a/jUNkpcemJAZ/ngrok-2.1.1-freebsd-386.tar.gz',
	freebsdx64:	'https://bin.equinox.io/a/kPYrp5NGZsQ/ngrok-2.1.1-freebsd-amd64.tar.gz'
};

var path = __dirname + '/bin/';
if (!fs.existsSync(path)) {
	fs.mkdirSync(path);
}

var which = os.platform() + os.arch();
https.get(files[which], function(resp) {
	var zip = fs.createWriteStream(path + 'ngrok.zip');
	resp.pipe(zip)
		.on('finish', function() {
			console.log('ngrok - binary downloaded (' + files[which] + ')...');
			unzipFile(path + 'ngrok.zip');
		})
		.on('error', function(e) {
			console.error('ngrok - error downloading binary', e);
			process.exit(1);
		});
});

function unzipFile(file) {
	new DecompressZip(file)
		.extract({path: path})
		.once('error', function(e) {
			console.error('ngrok - error unpacking binary', e);
			process.exit(1);
		})
		.once('extract', function(log) {
			var suffix = os.platform() === 'win32' ? '.exe' : '';
			if (suffix === '.exe') {
				fs.writeFileSync(path + 'ngrok.cmd', 'ngrok.exe');
			}
			fs.unlinkSync(path + 'ngrok.zip');
			var target = path + 'ngrok' + suffix;
			fs.chmodSync(target, 0755);
			if (fs.existsSync(target) && fs.statSync(target).size > 0) {
				console.log('ngrok - binary unpacked.');
				process.exit(0);
			}
			console.error('ngrok - error unpacking binary.');
			process.exit(1);
		});
}
