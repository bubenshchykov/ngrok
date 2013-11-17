var ngrok = require('..');
var http = require('http');
var request = require('request');

var port = 8080;
var localUrl = 'http://localhost:' + port;

describe('connecting to ngrok', function(){
	var tunnelUrl;

	before(function (done) {
		ngrok.connect({port: port, log: true}, function(err, url){
			tunnelUrl = url;
			done();
		});
	});

	it('should return tunnel url', function(){
		expect(tunnelUrl).not.to.be.empty;
	});

	it('should return url pointing to ngrok domain', function(){
		expect(tunnelUrl).to.match(/https:\/\/.(.*).ngrok.com/)
	});

	describe('starting simple local server', function() {

		before(function() {
			http.createServer(function (req, res) {
				res.writeHead(200);
				res.end('oki-doki: ' + req.url);
			}).listen(port);
		});

		describe('calling local server directly', function() {
			var respBody;

			before(function(done) {
				request.get(localUrl + '/local', function (err, resp, body) {
					respBody = body;
					done();
				});
			});

			it('should return oki-doki', function() {
				expect(respBody).to.equal('oki-doki: /local');
			});

			describe('calling local server through ngrok', function() {

				before(function(done) {
					request.get(tunnelUrl + '/ngrok', function (err, resp, body) {
						respBody = body;
						done();
					});
				});

				it('should return oki-doki too', function() {
					expect(respBody).to.equal('oki-doki: /ngrok');
				});

			});

			describe('disconnecting from ngrok', function () {

				before(function() {
					ngrok.disconnect();
				});

				describe('calling local server through discconected ngrok', function() {

					before(function(done) {
						request.get(tunnelUrl + '/ngrok', function (err, resp, body) {
							respBody = body;
							done();
						});
					});

					it('should return error message', function() {
						expect(respBody).to.match(/Tunnel (.)* not found/);
					});

				});

			});

		});

	});
});