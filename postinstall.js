console.error('ngrok - downloading newest binary...');

var os = require('os');
var fs = require('fs');
var util = require('util');
var https = require('https');
var DecompressZip = require('decompress-zip');

var source = 'https://api.equinox.io/1/Applications/ap_pJSFC5wQYkAyI0FIVwKYs9h1hW/Updates/Asset/ngrok.zip?channel=stable&';
var files = {
	darwinia32:	source + 'os=darwin&arch=386',
	darwinx64:	source + 'os=darwin&arch=amd64',
	linuxarm:	source + 'os=linux&arch=arm',
	linuxia32:	source + 'os=linux&arch=386',
	linuxx64:	source + 'os=linux&arch=amd64',
	win32ia32:	source + 'os=windows&arch=386',
	win32x64:	source + 'os=windows&arch=amd64',
	freebsdia32:	source + 'os=freebsd&arch=386',
	freebsdx64:	source + 'os=freebsd&arch=amd64'
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