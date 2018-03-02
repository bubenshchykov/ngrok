const colors = require('colors/safe');
const env = process.env;

if (env.TRAVIS_BRANCH === 'master' && (!env.NGROK_AUTHTOKEN_FREE || !env.NGROK_AUTHTOKEN_PAID)) {
	console.error('NGROK_AUTHTOKEN_FREE and NGROK_AUTHTOKEN_PAID not found');
	process.exit(1);
}

if (!env.NGROK_AUTHTOKEN_FREE) console.log(colors.yellow(
	`Warning: No process.env.NGROK_AUTHTOKEN_FREE found, falling back to shared authtoken.
Tests may blink if people use it simulatenously.
For stable test suite, signup at ngrok.com (free) and put your token here.`
));

if (!env.NGROK_AUTHTOKEN_PAID) console.log(colors.magenta(
	'Warning: no process.env.NGROK_AUTHTOKEN_PAID found, skipping related specs'
));

const chai = require('chai');
global.expect = chai.expect;
chai.config.includeStack = true;