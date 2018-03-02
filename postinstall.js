const os = require('os');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Zip = require('decompress-zip');
const request = require('request');
const {Transform} = require('stream');

const cdn = process.env.NGROK_CDN_URL || 'https://bin.equinox.io';
const cdnPath = process.env.NGROK_CDN_PATH || '/c/4VmDzA7iaHb/ngrok-stable-';
const cdnFiles = {
	darwinia32:	cdn + cdnPath + 'darwin-386.zip',
	darwinx64:	cdn + cdnPath + 'darwin-amd64.zip',
	linuxarm:		cdn + cdnPath + 'linux-arm.zip',
	linuxarm64:	cdn + cdnPath + 'linux-arm64.zip',
	linuxia32:	cdn + cdnPath + 'linux-386.zip',
	linuxx64:		cdn + cdnPath + 'linux-amd64.zip',
	win32ia32:	cdn + cdnPath + 'windows-386.zip',
	win32x64:		cdn + cdnPath + 'windows-amd64.zip',
	freebsdia32:cdn + cdnPath + 'freebsd-386.zip',
	freebsdx64:	cdn + cdnPath + 'freebsd-amd64.zip'
};

const arch = process.env.NGROK_ARCH || (os.platform() + os.arch());
const cdnFile = cdnFiles[arch];
if (!cdnFile) {
	console.error('ngrok - platform ' + arch + ' is not supported.');
	process.exit(1);
}

const binPath = path.join(__dirname, 'bin');
let localPath;
try {
	localPath = path.join(os.homedir(), '.ngrok');
	fs.existsSync(localPath) && fs.statSync(localPath).isDirectory() || fs.mkdirSync(localPath);
} catch (err) {
	localPath = binPath;
}

const localFileName = new Buffer(cdnFile).toString('base64');
const localFile = path.join(localPath, localFileName + '.zip');
const ignoreCache = process.env.NGROK_IGNORE_CACHE === 'true';

const maxAttempts = 3;
let attempts = 0;

if (!ignoreCache && fs.existsSync(localFile) && fs.statSync(localFile).size) {
	console.log('ngrok - cached download found at ' + localFile);
	extract(retry)
} else {
	download(retry);
}

function download(cb) {
	console.log('ngrok - downloading binary ' + cdnFile);

	const downloadStream = request
		.get(cdnFile)
		.on('response', res => {
			if (!/2\d\d/.test(res.statusCode)) {
				res.pause();
				return downloadStream.emit('error', new Error('wrong status code: ' + res.statusCode));
			}
			total = res.headers['content-length'];
			const progress = progressStream('ngrok - downloading progress: ', total);
			res.pipe(progress).pipe(outputStream);
		})
		.on('error', e => {
			console.warn('ngrok - error downloading binary', e);
			cb(e);
		});

	const outputStream = fs.createWriteStream(localFile)
		.on('error', e => {
			console.log('ngrok - error storing binary to local file', e);
			cb(e);
		})
		.on('finish', () => {
			console.log('\nngrok - binary downloaded to ' + localFile);
			extract(cb);
		});
}

function extract(cb) {
	console.log('ngrok - unpacking binary')
	new Zip(localFile).extract({path: binPath})
		.once('error', error)
		.once('extract', () => {
			const suffix = arch.indexOf('win32') === 0 ? '.exe' : '';
			if (suffix === '.exe')
				fs.writeFileSync(path.join(binPath, 'ngrok.cmd'), 'ngrok.exe');
			const target = path.join(binPath, 'ngrok' + suffix);
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

function retry(err) {
	attempts++;
	if (err && attempts === maxAttempts) {
		console.error('ngrok - install failed', err);
		return process.exit(1);
	}
	if (err) {
		console.warn('ngrok - install failed, retrying');
		return setTimeout(download, 500, retry);
	}
	process.exit(0);
}

function progressStream(msg, total) {
	let downloaded = 0;
	let shouldClearLine = false;
	const log = () => {
		if (shouldClearLine) {
			readline.clearLine(process.stdout);
			readline.cursorTo(process.stdout, 0);
		}
		let progress = downloaded + (total ? ('/' + total) : '');
		process.stdout.write(msg + progress);
		shouldClearLine = true;
	};
	if (total > 0) log();
	return new Transform({
		transform(data, enc, cb) {
			downloaded += data.length;
			log();
			cb(null, data);
		}
	});
}
