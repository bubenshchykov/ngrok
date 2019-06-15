const homedir = require('homedir');
const path = require('path');
const fs = require('fs');
const child_process = require('child_process');

const postinstallPath = path.join(__dirname, '../postinstall.js');
const ngrokPath = path.join(homedir(), '/.ngrok');
const certpath = `${ngrokPath}/testCert.pem`;
const npmrcPath = path.join(homedir(), '.npmrc');
const npmrcBackupPath = path.join(homedir(), '.npmrc.bak');

describe('postinstall', () => {
	before(() => {
		clearNgrokDirectory();
		writeTestPemFile();
		updateNpmrc();
	});

	it('should run using invalid CA without crashing', done => {
		const postinstall = child_process.fork(postinstallPath);
		postinstall.on('exit', done);
	});

	after(() => {
		clearNgrokDirectory();
		restoreFiles();
	});
});

function restoreFiles() {
	fs.unlinkSync(npmrcPath);
	if (fs.existsSync(npmrcBackupPath)) {
		fs.copyFileSync(npmrcBackupPath, npmrcPath);
	}
	fs.unlinkSync(npmrcBackupPath);
}

function clearNgrokDirectory() {
	const files = fs.readdirSync(ngrokPath);
	files.forEach(f => fs.unlinkSync(path.join(ngrokPath, f)));
}

function writeTestPemFile() {
	const pem = '-junk-to-test-ignore-';
	fs.writeFileSync(certpath, pem, { flag: 'w' });
}

function updateNpmrc() {
	if (fs.existsSync(npmrcPath)) {
		fs.copyFileSync(npmrcPath, npmrcBackupPath);
	}

	fs.writeFileSync(npmrcPath, `cafile=${certpath}`, { flag: 'w' });
}
