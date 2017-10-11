var os = require('os');
var fs = require('fs');
var path = require('path');
var readline = require('readline');
var Zip = require('decompress-zip');
var request = require('request');

var cdn = process.env.NGROK_CDN_URL || 'https://bin.equinox.io';
var cdnPath = process.env.NGROK_CDN_PATH || '/c/4VmDzA7iaHb/ngrok-stable-';
var cdnFiles = {
	darwinia32:	cdn + cdnPath + 'darwin-386.zip',
	darwinx64:	cdn + cdnPath + 'darwin-amd64.zip',
	linuxarm:	cdn + cdnPath + 'linux-arm.zip',
	linuxarm64:	cdn + cdnPath + 'linux-arm64.zip',
	linuxia32:	cdn + cdnPath + 'linux-386.zip',
	linuxx64:	cdn + cdnPath + 'linux-amd64.zip',
	win32ia32:	cdn + cdnPath + 'windows-386.zip',
	win32x64:	cdn + cdnPath + 'windows-amd64.zip',
	freebsdia32:	cdn + cdnPath + 'freebsd-386.zip',
	freebsdx64:	cdn + cdnPath + 'freebsd-amd64.zip'
};

var arch = process.env.NGROK_ARCH || (os.platform() + os.arch());
var cdnFile = cdnFiles[arch];

var binPath = path.join(__dirname, 'bin');
var localPath;
try {
	localPath = path.join(os.homedir(), '.ngrok');
	fs.existsSync(localPath) || fs.mkdirSync(localPath);
} catch (err) {
	localPath = binPath;
}
var localFileName = new Buffer(cdnFile).toString('base64');
var localFile = path.join(localPath, localFileName + '.zip');
var ignoreCache = process.env.NGROK_IGNORE_CACHE === 'true';

install();

function install () {
	if (!ignoreCache && fs.existsSync(localFile) && fs.statSync(localFile).size) {
		extract(retry)
	} else if (!cdnFile) {
		console.error('ngrok - platform ' + arch + ' is not supported.');
		process.exit(1);
	} else {
		download(retry);
	}

	var attempts = 0;
	var maxAttempts = 3;

	function retry(err) {
		attempts++;
		if (err && attempts === maxAttempts) {
			console.error('ngrok - install failed', err);
			return process.exit(1);
		}
		if (err) {
			console.warn('ngrok - install failed, retrying');
			return setTimeout(function() {
				download(retry);
			}, 500);
		}
		process.exit(0);
	}
}

function extract(cb) {
	console.log('ngrok - unpacking binary')
	new Zip(localFile).extract({path: binPath})
		.once('error', error)
		.once('extract', function() {
			var suffix = arch.indexOf('win32') === 0 ? '.exe' : '';
			if (suffix === '.exe')
				fs.writeFileSync(path.join(binPath, 'ngrok.cmd'), 'ngrok.exe');
			var target = path.join(binPath, 'ngrok' + suffix);
			fs.chmodSync(target, 0755);
			if (!fs.existsSync(target) || fs.statSync(target).size <= 0)
				return error(new Error('corrupted file ' + target));
			console.log('ngrok - binary unpacked to ' + target);
			cb(null);
		});

	function error(e) {
		console.warn('ngrok - error unpacking binary', e);
		cb(e);
	}
}

function download(cb) {
	console.log('ngrok - downloading binary ' + cdnFile);
	var total = 0;
	var downloaded = 0;
	var shouldClearLine = false;

	var showProgress = function () {
		if (shouldClearLine) {
			readline.clearLine(process.stdout);
			readline.cursorTo(process.stdout, 0);
		}

		var progress = downloaded + (total ? ('/' + total) : '');
		process.stdout.write('ngrok - downloading progress: ' + progress);
		shouldClearLine = true;
	};

	var downloadStream = request
		.get(cdnFile)
		.on('response', function (res) {
			if (!/2\d\d/.test(res.statusCode)) {
				res.pause();
				return downloadStream.emit('error', new Error('wrong status code: ' + res.statusCode));
			}

			res.pipe(outputStream);

			total = res.headers['content-length'];
			total > 0 && showProgress();
		})
		.on('data', function (data) {
			downloaded += data.length;
			showProgress();
		})
		.on('error', function(e) {
			console.warn('ngrok - error downloading binary', e);
			cb(e);
		});

	var outputStream = fs.createWriteStream(localFile)
		.on('error', function(e) {
			console.log('ngrok - error storing binary to local file', e);
			cb(e);
		})
		.on('finish', function () {
			console.log('\nngrok - binary downloaded to ' + localFile);
			extract(cb);
		});
}
