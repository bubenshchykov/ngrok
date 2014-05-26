console.error('ngrok - Downloading newest binary...');

var os = require('os');
var https = require('https');
var fs = require('fs');
var util = require('util');
var DecompressZip = require('decompress-zip');

var files = {
	darwinia32: 'https://dl.ngrok.com/darwin_amd64/ngrok.zip',
	darwinx64: 'https://dl.ngrok.com/darwin_amd64/ngrok.zip',
	linuxarm: 'https://dl.ngrok.com/linux_arm/ngrok.zip',
	linuxia32: 'https://dl.ngrok.com/linux_386/ngrok.zip',
	linuxx64: 'https://dl.ngrok.com/linux_386/ngrok.zip',
	win32ia32: 'https://dl.ngrok.com/windows_386/ngrok.zip',
	win32x64: 'https://dl.ngrok.com/windows_386/ngrok.zip'
}

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
