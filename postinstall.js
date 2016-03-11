console.error('ngrok - downloading newest binary...');

var os = require('os');
var fs = require('fs');
var util = require('util');
var https = require('https');
var DecompressZip = require('decompress-zip');
var tar = require('tar');

var cdn = process.env.npm_config_ngrok_cdnurl ||
	process.env.NGROK_CDNURL ||
	'https://bin.equinox.io';

var files = {
	darwinia32:	cdn + '/a/hU5xF8ZzQgp/ngrok-2.1.1-darwin-386.zip',
	darwinx64:	cdn + '/a/bZszyrZZM3G/ngrok-2.1.1-darwin-amd64.zip',
	linuxarm:	cdn + '/a/e7Ywipw6GyW/ngrok-2.1.1-linux-arm.tar.gz',
	linuxia32:	cdn + '/a/4vkGbFY6yNM/ngrok-2.1.1-linux-386.tar.gz',
	linuxx64:	cdn + '/a/b87faFPKrii/ngrok-2.1.1-linux-amd64.tar.gz',
	win32ia32:	cdn + '/a/54cQjE1obr2/ngrok-2.1.1-windows-386.zip',
	win32x64:	cdn + '/a/chRZWPptE7w/ngrok-2.1.1-windows-amd64.zip',
	freebsdia32:cdn + '/a/jUNkpcemJAZ/ngrok-2.1.1-freebsd-386.tar.gz',
	freebsdx64:	cdn + '/a/kPYrp5NGZsQ/ngrok-2.1.1-freebsd-amd64.tar.gz'
};

var path = __dirname + '/bin/';
if (!fs.existsSync(path)) {
	fs.mkdirSync(path);
}

var which = os.platform() + os.arch();
var downloadFile = files[which];
https.get(downloadFile, function(resp) {
	var save = fs.createWriteStream(path + 'ngrok.zip');
	resp.pipe(save)
		.on('finish', function() {
			console.log('ngrok - binary downloaded (' + downloadFile + ')...');
			extract(path + 'ngrok.zip');
		})
		.on('error', function(e) {
			console.error('ngrok - error downloading binary', e);
			process.exit(1);
		});
});

function extract(file) {
	if (downloadFile.indexOf('.zip') > -1) {
		new DecompressZip(file)
			.extract({path: path})
			.once('error', error)
			.once('extract', finish);	
	} else {
		fs.createReadStream(path + 'ngrok.zip')
			.pipe(tar.extract({path: path}))
			.on('finish', finish)
			.on('error', error);
	}	
}

function finish() {
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
}

function error(e) {
	console.error('ngrok - error unpacking binary', e);
	process.exit(1);
}