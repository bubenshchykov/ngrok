const homedir = require('homedir');
const path = require('path');
const forge = require('node-forge').pki;
const fs = require('fs');
const child_process = require('child_process');

const postinstallPath = path.join(__dirname, '../postinstall.js');
const ngrokPath = path.join(homedir(), '/.ngrok');
const certpath = `${ngrokPath}/testCert.pem`;
const npmrcPath = path.join(homedir(), '.npmrc');
const npmrcBackupPath = path.join(homedir(), '.npmrc.bak');

describe.only('postinstall cert', () => {
	before(() => {
		clearNgrokDirectory();
		writeTestPemFile();
		updateNpmrc();
		console.log(fs.readFileSync(npmrcPath).toString());
	});

	it('should run using CA without crashing', done => {
		const postinstall = child_process.fork(postinstallPath, { stdio: 'ignore' });
		postinstall.on('exit', done);
	});

	after(() => {
		clearNgrokDirectory();
		restoreFiles();
	});
});

function restoreFiles() {
	fs.unlinkSync(npmrcPath);
	fs.copyFileSync(npmrcBackupPath, npmrcPath);
	fs.unlinkSync(npmrcBackupPath);
}

function clearNgrokDirectory() {
	const files = fs.readdirSync(ngrokPath);
	files.forEach(f => fs.unlinkSync(path.join(ngrokPath, f)));
}

function writeTestPemFile() {
	const pem = createPem();
	fs.writeFileSync(certpath, pem, { flag: 'w' });
}

function updateNpmrc() {
	fs.copyFileSync(npmrcPath, npmrcBackupPath);
	fs.writeFileSync(npmrcPath, `cafile=${certpath}`);
}

function createPem() {
	const keys = forge.rsa.generateKeyPair(2048);
	const cert = forge.createCertificate();
	cert.publicKey = keys.publicKey;
	cert.serialNumber = '01';
	cert.validity.notBefore = new Date();
	cert.validity.notAfter = new Date();
	cert.validity.notAfter.setHours(cert.validity.notBefore.getHours() + 1);
	const attrs = [{ name: 'commonName', value: 'localhost' }];
	cert.setSubject(attrs);
	cert.setIssuer(attrs);
	cert.setExtensions([
		{
			name: 'basicConstraints',
			cA: true
		},
		{
			name: 'keyUsage',
			keyCertSign: true,
			digitalSignature: true,
			nonRepudiation: true,
			keyEncipherment: true,
			dataEncipherment: true
		},
		{
			name: 'extKeyUsage',
			serverAuth: true,
			clientAuth: true,
			codeSigning: true,
			emailProtection: true,
			timeStamping: true
		},
		{
			name: 'nsCertType',
			client: true,
			server: true,
			email: true,
			objsign: true,
			sslCA: true,
			emailCA: true,
			objCA: true
		},
		{
			name: 'subjectAltName',
			altNames: [
				{
					type: 7, // IP
					ip: '127.0.0.1'
				}
			]
		},
		{
			name: 'subjectKeyIdentifier'
		}
	]);
	cert.sign(keys.privateKey);

	return forge.certificateToPem(cert);
}
