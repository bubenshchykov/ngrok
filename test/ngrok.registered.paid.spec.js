var ngrok = require('..');
var http = require('http');
var net = require('net');
var request = require('request');
var URL = require('url');
var uuid = require('uuid');
var util = require('./util');

var port = 8080;
var authtoken = process.env.NGROK_AUTHTOKEN_PAID;
var localUrl = 'http://127.0.0.1:' + port;
var tunnelUrl, respBody;

describe('registered.paid.spec.js - setting paid authtoken', function() {

	before(async function() {
		await ngrok.kill();
		await ngrok.authtoken(authtoken);
	});

	after(function() {
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

		after(function(done) {
			server.close(done.bind(null, null));
		});

		describe('calling local server directly', function() {
			
			before(function(done) {
				request.get(localUrl + '/local', function (err, resp, body) {
					respBody = body;
					done(err);
				});
			});

			it('should return oki-doki', function() {
				expect(respBody).to.equal('oki-doki: /local');
			});

			describe('connecting to ngrok with port specified', function () {

				before(async () => {
					tunnelUrl = await ngrok.connect(port);
				});

				it('should return url pointing to ngrok domain', function(){
					expect(tunnelUrl).to.match(/https:\/\/.(.*).ngrok.io/);
				});

				describe('calling local server through ngrok', function() {

					before(function(done) {
						request.get(tunnelUrl + '/ngrok', function (err, resp, body) {
							respBody = body;
							done(err);
						});
					});

					it('should return oki-doki too', function() {
						expect(respBody).to.equal('oki-doki: /ngrok');
					});

					describe('disconnecting from ngrok', function () {

						before(async () => await ngrok.disconnect());

						describe('calling local server through discconected ngrok', function() {

							before(function(done) {
								request.get(tunnelUrl + '/ngrok', function (err, resp, body) {
									respBody = body;
									done(err);
								});
							});

							it('should return error message', function() {
								expect(respBody).to.match(/Tunnel (.)* not found/);
							});

						});

					});

				});
			});

			describe('connecting to ngrok with subdomain', function () {
				var uniqDomain = 'koko-' + uuid.v4();
				
				before(async () => {
					tunnelUrl = await ngrok.connect({
						port: port,
						subdomain: uniqDomain
					});
				});

				it('should return ngrok url with a given subdomain', function(){
					expect(tunnelUrl).to.equal('https://' + uniqDomain + '.ngrok.io');
				});

				describe('calling local server through ngrok', function() {

					before(function(done) {
						request.get(tunnelUrl + '/ngrok-subdomain', function (err, resp, body) {
							respBody = body;
							done(err);
						});
					});

					it('should return oki-doki too', function() {
						expect(respBody).to.equal('oki-doki: /ngrok-subdomain');
					});

				});

				describe('connecting to ngrok with same subdomain again', function () {
					var error;

					before(async () =>  {
						try {
							tunnelUrl = await ngrok.connect({
								port: port,
								subdomain: uniqDomain
							});
						} catch(err) {
							error = err;
							console.log(err);
						}
					});

					it('should return an error that the tunnel is already established', function () {
						expect(error.msg).to.equal('failed to start tunnel');
						expect(error.details.err).to.contain('is already bound to another tunnel session');
					});
				});

				describe('disconnecting from ngrok and connecting with same subdomain again', function () {
					var error;

					before(async () => await ngrok.disconnect());

					before(async () =>  {
						tunnelUrl = await ngrok.connect({
							port: port,
							subdomain: uniqDomain
						});
					});

					it('should be able to connect and return the same ngrok url', function(){
						expect(tunnelUrl).to.equal('https://' + uniqDomain + '.ngrok.io');
					});
				});
			});

			describe('connecting to ngrok with auth', function () {
				
				before(async () => {
					tunnelUrl = await ngrok.connect({
						port: port,
						auth: 'oki:doki'
					});
				});

				it('should return url pointing to ngrok domain', function(){
					expect(tunnelUrl).to.match(/https:\/\/.(.*).ngrok.io/);
				});

				describe('calling local server through ngrok without http authorization', function() {

					before(function(done) {
						request.get(tunnelUrl + '/ngrok-httpauth', function (err, resp, body) {
							respBody = body;
							done(err);
						});
					});

					it('should return error message', function() {
						expect(respBody).to.contain('Authorization Failed');
					});

				});

				describe('calling local server through ngrok with http authorization', function() {

					before(function(done) {
						request.get(tunnelUrl + '/ngrok-httpauth', {auth: {user: 'oki', password: 'doki'}}, function (err, resp, body) {
							respBody = body;
							done(err);
						});
					});

					it('should return oki-doki too', function() {
						expect(respBody).to.equal('oki-doki: /ngrok-httpauth');
					});

				});
			});

		});
	});

	describe('starting local tcp server', function () {
			
		var tcpServerPort;
		before(function(done) {
			var tcpServer = net.createServer(function(socket) {
				socket.end('oki-doki: tcp');
			}).listen(0, '127.0.0.1', function() {
				tcpServerPort = tcpServer.address().port;
				done();
			});
		});

		describe('connecting to ngrok by tcp', function() {
			var tunnelUrlParts;
			before(async () =>  {
				tunnelUrl = await ngrok.connect({
					proto: 'tcp',
					port: tcpServerPort
				});
				tunnelUrlParts = URL.parse(tunnelUrl);
			});

			it('should return ngrok url with tcp protocol', function() {
				expect(tunnelUrlParts.protocol).to.equal('tcp:');
			});

			it('should return ngrok url with a port', function() {
				expect(tunnelUrlParts.port).to.be.ok;
			});

			describe('calling local tcp server through ngrok', function() {
				var socketData;
				var socket;
				
				before(function (done) {
					net.connect(+tunnelUrlParts.port, tunnelUrlParts.hostname)
						.once('data', function(data) {
							socketData = data.toString();
							done();
						})
						.on('error', Object);
				});

				it('should be able to connect through the tunnel', function() {
					expect(socketData).to.equal('oki-doki: tcp');
				});
			});
		})
	});
});