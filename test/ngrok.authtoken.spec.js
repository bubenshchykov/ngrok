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

describe('authtoken.spec.js - ensuring no authtoken set', function() {

	before(function(done) {
		ngrok.kill(done);
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

		describe('connecting to ngrok with authtoken and subdomain', function () {
			var uniqDomain = 'koko-' + uuid.v4();
			
			before(function (done) {
				ngrok.connect({
					port: port,
					subdomain: uniqDomain,
					authtoken: authtoken
				}, function(err, url){
					tunnelUrl = url;
					done(err);
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
		});	
	});
});