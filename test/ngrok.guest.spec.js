var ngrok = require('..');
var http = require('http');
var net = require('net');
var request = require('request');
var URL = require('url');
var uuid = require('node-uuid');
var util = require('./util');

var port = 8080;
var localUrl = 'http://127.0.0.1:' + port;
var tunnelUrl, respBody;

describe('guest.spec.js - ensuring no authtoken set', function() {

	before(function(done) {
		ngrok.kill(function() {
			util.removeAuthtoken();
			done();
		})
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

						describe('calling local server through discconected https ngrok', function() {

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

						describe('calling local server through discconected http ngrok', function() {

							before(function(done) {
								request.get(tunnelUrl.replace('https', 'http') + '/ngrok', function (err, resp, body) {
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

			describe('connecting to ngrok with custom region', function () {

				before(ngrok.kill);

				before(function (done) {
					ngrok.connect({region: 'eu'}, function(err, url){
						tunnelUrl = url;
						done(err);
					});
				});

				it('should return url pointing to ngrok eu region', function(){
					expect(tunnelUrl).to.match(/https:\/\/.(.*).eu.ngrok.io/);
				});
			});

			describe('connecting to ngrok with subdomain', function () {
				var uniqDomain = 'koko-' + uuid.v4();
				var error;
				
				before(function (done) {
					ngrok.connect({
						port: port,
						subdomain: uniqDomain
					}, function(err){
						error = err;
						done();
					});
				});

				it('should return error', function(){
					expect(error.msg).to.equal('failed to start tunnel');
					expect(error.details.err).to.contain('Only paid plans may bind custom subdomains');
				});

			});

		});
	});
});