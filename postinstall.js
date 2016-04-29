var os = require('os');
var fs = require('fs');
var tar = require('tar.gz');
var Zip = require('decompress-zip');
var request = require('request');

var cdn = process.env.NGROK_CDN_URL || 'https://bin.equinox.io';
var bins = {
	darwinia32:	cdn + '/a/hU5xF8ZzQgp/ngrok-2.1.1-darwin-386.zip',
	darwinx64:	cdn + '/a/bZszyrZZM3G/ngrok-2.1.1-darwin-amd64.zip',
	linuxarm:	cdn + '/a/e7Ywipw6GyW/ngrok-2.1.1-linux-arm.tar.gz',
	linuxia32:	cdn + '/a/4vkGbFY6yNM/ngrok-2.1.1-linux-386.tar.gz',
	linuxx64:	cdn + '/a/b87faFPKrii/ngrok-2.1.1-linux-amd64.tar.gz',
	win32ia32:	cdn + '/a/54cQjE1obr2/ngrok-2.1.1-windows-386.zip',
	win32x64:	cdn + '/a/chRZWPptE7w/ngrok-2.1.1-windows-amd64.zip',
	freebsdia32:	cdn + '/a/jUNkpcemJAZ/ngrok-2.1.1-freebsd-386.tar.gz',
	freebsdx64:	cdn + '/a/kPYrp5NGZsQ/ngrok-2.1.1-freebsd-amd64.tar.gz'
};

var arch = os.platform() + os.arch();
var hostedFile = bins[arch];

if (!hostedFile) {
	console.error('ngrok - platform ' + arch + ' is not supported.');
	process.exit(1);
}

var isZip = /.zip$/.test(hostedFile);
var localPath = __dirname + '/bin/';
var localFile = localPath + (isZip ? 'ngrok.zip' : 'ngrok.tar');

console.log('ngrok - downloading binary ' + hostedFile + ' ...');

request
	.get(hostedFile)
	.pipe(fs.createWriteStream(localFile))
	.on('finish', function() {
		console.log('ngrok - binary downloaded...');
		extract();
	})
	.on('error', function(e) {
		console.error('ngrok - error downloading binary.', e);
		process.exit(1);
	});

function extract() {
	isZip ?
		new Zip(localFile).extract({path: localPath})
			.once('error', error)
			.once('extract', finish) :
		tar().extract(localFile, localPath, function(err) {
			if (err) return error(err);
			finish();
		});
}

function finish() {
	var suffix = os.platform() === 'win32' ? '.exe' : '';
	if (suffix === '.exe')
		fs.writeFileSync(localPath + 'ngrok.cmd', 'ngrok.exe');
	fs.unlinkSync(localFile);
	var target = localPath + 'ngrok' + suffix;
	fs.chmodSync(target, 0755);
	if (!fs.existsSync(target) || fs.statSync(target).size <= 0)
		return error(new Error('corrupted file ' + target));
	console.log('ngrok - binary unpacked.');
	process.exit(0);
}

function error(e) {
	console.error('ngrok - error unpacking binary', e);
	process.exit(1);
}