var ngrok = require('..');
var http = require('http');
var net = require('net');
var request = require('request');
var URL = require('url');
var uuid = require('node-uuid');
var util = require('./util');

var port = 8080;
var authtoken = '85we1WG4aVvAuZQFMJ1Cx_3qRinSG444A1bQQafx5ko';
var localUrl = 'http://127.0.0.1:' + port;
var tunnelUrl, respBody;

describe('setting free authtoken', function() {

	before(function(done) {
		ngrok.kill(function() {
			ngrok.authtoken(authtoken, done);
		});
	});

	after(function(done) {
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

				before(function (done) {
					ngrok.connect(port, function(err, url){
						tunnelUrl = url;
						done(err);
					});
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

						before(function(done) {
							ngrok.disconnect(done);
						});

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
				var error;

				before(function (done) {
					ngrok.connect({
						port: port,
						subdomain: uniqDomain
					}, function(err, url){
						error = err;
						done();
					});
				});

				it('should return error', function(){
					expect(error.msg).to.equal('failed to start tunnel');
					expect(error.details.err).to.contain('Only paid plans may bind custom subdomains');
				});
			});

			describe('connecting to ngrok with auth', function () {
				
				before(function (done) {
					ngrok.connect({
						port: port,
						auth: 'oki:doki'
					}, function(err, url){
						tunnelUrl = url;
						done(err);
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
						expect(respBody).to.contain('Unauthorized');
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
			before(function (done) {
				ngrok.connect({
					proto: 'tcp',
					port: tcpServerPort
				}, function(err, url){
					tunnelUrl = url;
					tunnelUrlParts = URL.parse(tunnelUrl);
					done(err);
				});
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
						.on('error', function(err) {
							done(err);
						});
				});

				it('should be able to connect through the tunnel', function() {
					expect(socketData).to.equal('oki-doki: tcp');
				});
			});
		})
	});
});