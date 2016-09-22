if (!process.env.NGROK_AUTHTOKEN_PAID || !process.env.NGROK_AUTHTOKEN_FREE) {
	console.error('tests expect NGROK_AUTHTOKEN_FREE and NGROK_AUTHTOKEN_PAID in env vars, put yours!');
	process.exit(1);
}

var chai = require('chai');
global.expect = chai.expect;
chai.Assertion.includeStack = true;