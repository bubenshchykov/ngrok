var homedir = require('homedir');
var path = require('path');
var fs = require('fs');

function removeAuthtoken() {
	try {
		fs.unlinkSync(path.join(homedir(), '/.ngrok2/ngrok.yml'));
	}
	catch(ex) {
	}
}

module.exports = {
	removeAuthtoken: removeAuthtoken
}