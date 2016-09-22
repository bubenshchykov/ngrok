var os = require('os');
var fs = require('fs');
var Zip = require('decompress-zip');
var request = require('request');

var cdn = process.env.NGROK_CDN_URL || 'https://bin.equinox.io';
var cdnPath = process.env.NGROK_CDN_PATH || '/c/4VmDzA7iaHb/ngrok-stable-';
var cdnFiles = {
	darwinia32:	cdn + cdnPath + 'darwin-386.zip',
	darwinx64:	cdn + cdnPath + 'darwin-amd64.zip',
	linuxarm:	cdn + cdnPath + 'linux-arm.zip',
	linuxia32:	cdn + cdnPath + 'linux-386.zip',
	linuxx64:	cdn + cdnPath + 'linux-amd64.zip',
	win32ia32:	cdn + cdnPath + 'windows-386.zip',
	win32x64:	cdn + cdnPath + 'windows-amd64.zip',
	freebsdia32:	cdn + cdnPath + 'freebsd-386.zip',
	freebsdx64:	cdn + cdnPath + 'freebsd-amd64.zip'
};

var arch = process.env.NGROK_ARCH || (os.platform() + os.arch());
var cdnFile = cdnFiles[arch];

if (!cdnFile) {
	console.error('ngrok - platform ' + arch + ' is not supported.');
	process.exit(1);
}

var localPath = __dirname + '/bin/';
var localFile = localPath + 'ngrok.zip';

console.log('ngrok - downloading binary ' + cdnFile + ' ...');

request
	.get(cdnFile)
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
	new Zip(localFile).extract({path: localPath})
		.once('error', error)
		.once('extract', function() {
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
		});
}

function error(e) {
	console.error('ngrok - error unpacking binary', e);
	process.exit(1);
}