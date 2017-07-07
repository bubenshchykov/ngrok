var os = require('os');
var path = require('path');
var fs = require('fs');
var Zip = require('decompress-zip');
var rrs = require('request-retry-stream');
var readline = require('readline');

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

var binPath = path.join(__dirname, 'bin');
var localPath; // try to use home directory and binPath as fall back
try {
	localPath = path.join(os.homedir(), '.ngrok');
	fs.existsSync(localPath) || fs.mkdirSync(localPath);
} catch (err) {
	localPath = binPath;
}

// locale file name use the base64 hash of cdnFile url
// so that we will not use old version ngrok when upgrade this package
var localFileName = new Buffer(cdn + cdnPath).toString('base64') + '.zip';
var localFile = path.join(localPath, localFileName);

function deleteLocalFile () {
	try {
		fs.existsSync(localFile) && fs.unlink(localFile)
	} catch (error) {
		console.error(
			'ngrok - error delete corrupted file: ' + localFile + ', try yourself.'
		)
	}
}

function download (onFinish) {
	var arch = process.env.NGROK_ARCH || (os.platform() + os.arch());
	var cdnFile = cdnFiles[arch];
	// download to tempfile, mv to localFile when download success
	var tempFile = path.join(os.tmpdir(), localFileName);

	if (!cdnFile) {
		console.error('ngrok - platform ' + arch + ' is not supported.');
		process.exit(1);
	}

	var tempFileStream = fs.createWriteStream(tempFile);
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
		shouldClearLine= true;
	}

	rrs.get({
		url: cdnFile,
		attempts: 3,
		delay: 500,
		timeout: 50000,
		logFunction: console.warn
	})
	.on('response', function (res) {
		console.log('ngrok - download binary from ' + cdnFile);
		total = res.headers['content-length'] || res.headers['Content-Length'];
		if (total > 0) {
			showProgress();
		}
	})
	.on('data', function (data) {
		downloaded += data.length;
		showProgress();
		tempFileStream.write(data);
	})
	.on('finish', function () {
		console.log('ngrok - binary downloaded');
	    fs.createReadStream(tempFile)
	    	.pipe(fs.createWriteStream(localFile))
	    	.on('finish', onFinish);
	})
	.on('error', function (e) {
		console.error('ngrok - error downloading binary.', e);
		deleteLocalFile();
		process.exit(1);
	});
}

function extract() {
	function error(e) {
		console.error('ngrok - error unpacking binary', e);
		deleteLocalFile();
		process.exit(1);
	}

	function success () {
		var suffix = os.platform() === 'win32' ? '.exe' : '';
		if (suffix === '.exe') {
			fs.writeFileSync(path.join(binPath, 'ngrok.cmd'), 'ngrok.exe');
		}

		var target = path.join(binPath, 'ngrok' + suffix);

		if (!fs.existsSync(target) || fs.statSync(target).size <= 0) {
			return error(new Error('corrupted file ' + target));
		}

		fs.chmodSync(target, 0755);

		console.log('ngrok - binary unpacked.');
		process.exit(0);
	}

	new Zip(localFile)
			.once('error', error)
			.once('extract', success)
			.extract({path: binPath});
}

// extract directly if ngork zip file is already existed,
// or download from remote and extract it
if (fs.existsSync(localFile) && fs.statSync(localFile).size > 0) {
	extract();
} else {
	download(extract);
}

