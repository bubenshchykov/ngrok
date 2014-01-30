var ngrok = require('..');
var http = require('http');
var request = require('request');

var port = 8080;
var authtoken = '9qh-WUj4noglhhjqe_-Q';
var localUrl = 'http://localhost:' + port;
var tunnelUrl, respBody;

describe('starting simple local server', function() {

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
				expect(tunnelUrl).to.match(/https:\/\/.(.*).ngrok.com/)
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

			it('should return ngrok url with and given subdomain', function(){
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
				expect(tunnelUrl).to.match(/https:\/\/.(.*).ngrok.com/)
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
