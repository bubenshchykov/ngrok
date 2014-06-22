var ngrok = require('..');
var http = require('http');
var net = require('net');
var request = require('request');
var URL = require('url');

var port = 8080;
var authtoken = '9qh-WUj4noglhhjqe_-Q';
var localUrl = 'http://localhost:' + port;
var tunnelUrl, respBody;

describe('starting local http server', function() {

	before(function() {
		http.createServer(function (req, res) {
			res.writeHead(200);
			res.end('oki-doki: ' + req.url);
		}).listen(port);
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
				expect(tunnelUrl).to.match(/https:\/\/.(.*).ngrok.com/);
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

		describe('connecting to ngrok with authtoken and subdomain', function () {
			var uniqDomain = 'koko-' + Math.random().toString(36).slice(-4); 
			
			before(function (done) {
				ngrok.connect({
					port: port,
					authtoken: authtoken,
					subdomain: uniqDomain
				}, function(err, url){
					tunnelUrl = url;
					done(err);
				});
			});

			it('should return ngrok url with a given subdomain', function(){
				expect(tunnelUrl).to.equal('https://' + uniqDomain + '.ngrok.com');
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

				before(function (done) {
					ngrok.connect({
						port: port,
						authtoken: authtoken,
						subdomain: uniqDomain
					}, function(err, url){
						error = err;
						done();
					});
				});

				it('should return an error that the tunnel is already established', function () {
					expect(error)
						.to.be.an.instanceof(Error)
						.to.match(/ngrok: The tunnel (.*) is already registered/);
				});
			});

			describe('disconnecting from ngrok and connecting with same subdomain again', function () {
				var error;

				before(function(done) {
					ngrok.disconnect(done);
				});

				before(function (done) {
					ngrok.connect({
						port: port,
						authtoken: authtoken,
						subdomain: uniqDomain
					}, function(err, url){
						error = err;
						done();
					});
				});

				it('should be able to connect and return the same ngrok url', function(){
					expect(tunnelUrl).to.equal('https://' + uniqDomain + '.ngrok.com');
				});
			});
		});

		describe('connecting to ngrok with authtoken and httpauth', function () {
			
			before(function (done) {
				ngrok.connect({
					port: port,
					authtoken: authtoken,
					httpauth: 'oki:doki'
				}, function(err, url){
					tunnelUrl = url;
					done(err);
				});
			});

			it('should return url pointing to ngrok domain', function(){
				expect(tunnelUrl).to.match(/https:\/\/.(.*).ngrok.com/);
			});

			describe('calling local server through ngrok without http authorization', function() {

				before(function(done) {
					request.get(tunnelUrl + '/ngrok-httpauth', function (err, resp, body) {
						respBody = body;
						done(err);
					});
				});

				it('should return error message', function() {
					expect(respBody).to.contain('Authorization required');
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
		
	var tcpServer;
	var tcpServerPort;
	before(function(done) {
		tcpServer = net.createServer(function(socket) {
			socket.end('oki-doki: tcp');
		});
		// bind to some new port
		tcpServer.listen(0, function() {
			tcpServerPort = tcpServer.address().port;
			done();
		});
	});

	describe('connecting to ngrok by tcp', function() {
		var tunnelUrlParts;
		before(function (done) {
			ngrok.connect({
				proto: 'tcp',
				port: tcpServerPort,
				authtoken: authtoken,
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
			before(function(done) {
				var socket = net.connect(
					tunnelUrlParts.port,
					tunnelUrlParts.hostname,
					function() {
						socket.once('data', function(data) {
							socketData = data.toString();
							done();
						});
					}
				);
			});

			it('should be able to connect through the tunnel', function() {
				expect(socketData).to.equal('oki-doki: tcp');
			});
		});
	})
});