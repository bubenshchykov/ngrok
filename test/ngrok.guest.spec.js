var ngrok = require('..');
var http = require('http');
var net = require('net');
var request = require('request-promise-native');
var URL = require('url');
var uuid = require('uuid');
var util = require('./util');

var port = 8080;
var localUrl = 'http://127.0.0.1:' + port;
var tunnelUrl, respBody, error;

describe('guest.spec.js - ensuring no authtoken set', function() {

	before(async function() {
		await ngrok.kill();
		util.removeAuthtoken();
	});

	describe('starting local http server', function() {

		var server;

		before(function(done) {
			server = http.createServer(function (req, res) {
				res.writeHead(200);
				res.end('oki-doki: ' + req.url);
			}).listen(port, done);
		});

		after(function (done) {
			server.close(done.bind(null, null));
		});

		describe('calling local server directly', function() {
			
			before(async function () {
				respBody = await request.get(localUrl + '/local');
			});

			it('should return oki-doki', function() {
				expect(respBody).to.equal('oki-doki: /local');
			});

			describe('connecting to ngrok with port specified', function () {

				before(async function () {
					tunnelUrl = await ngrok.connect(port)
				});

				it('should return url pointing to ngrok domain', function(){
					expect(tunnelUrl).to.match(/https:\/\/.(.*).ngrok.io/);
				});

				describe('calling local server through ngrok', function() {

					before(async function () {
						respBody = await request.get(tunnelUrl + '/ngrok');
					});

					it('should return oki-doki too', function() {
						expect(respBody).to.equal('oki-doki: /ngrok');
					});

					describe('disconnecting from ngrok', function () {

						before(async function () {
							await ngrok.disconnect();
						});

						describe('calling local server through discconected https ngrok', function() {

							before(async function () {
								try {
									await request.get(tunnelUrl + '/ngrok')
								} catch (err) {
									respBody = err.response.body
								}
							});

							it('should return error message', function() {
								expect(respBody).to.match(/Tunnel (.)* not found/);
							});

						});

						describe('calling local server through discconected http ngrok', function() {

							before(async function () {
								try {
									await request.get(tunnelUrl.replace('https', 'http') + '/ngrok');
								} catch (err) {
									respBody = err.response.body
								}
							});

							it('should return error message', function() {
								expect(respBody).to.match(/Tunnel (.)* not found/);
							});

						});

					});

				});
			});

			describe.only('connecting to ngrok with custom region', function () {

				before(async () => await ngrok.kill());

				before(async function () {
					tunnelUrl = await ngrok.connect({region: 'eu'})
				});

				it('should return url pointing to ngrok eu region', function(){
					expect(tunnelUrl).to.match(/https:\/\/.(.*).eu.ngrok.io/);
				});
			});

			describe('connecting to ngrok with subdomain', function () {
				var uniqDomain = 'koko-' + uuid.v4();
				var error;
				
				before(async function () {
					try {
						await ngrok.connect({
							port: port,
							subdomain: uniqDomain
						});
					} catch (err) {
						error = err
					}
				});

				it('should return error', function(){
					expect(error.response.body.msg).to.equal('failed to start tunnel');
					expect(error.response.body.details.err).to.contain('Only paid plans may bind custom subdomains');
				});

			});

			describe('connecting to ngrok with web_addr:false (disabling) ngrok api and ui)', function () {

				before(async function () {
					try {
						await ngrok.connect({web_addr: false})
					} catch (err) {
						error = err;
					}
				});

				it('should return error', function () {
					expect(error.message).to.contain('web_addr:false is not supported');
				});

			});

		});
	});
});