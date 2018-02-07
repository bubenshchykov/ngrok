var Ngrok = require('..');
var util = require('./util');

describe('guest.eventemitter.spec.js - ensuring no authtoken set, using ngrok as event emitter', function ( ) {
	const ngrok = new Ngrok()

	before(async function () {
		await ngrok.kill();
		util.removeAuthtoken();
	});

	describe('connecting to ngrok', function ( ) {
		var connected, tunnelUrl, webAddrUrl;
		before(function (done) {
			ngrok.once('connect', function (url, uiUrl) {
				connected = true;
				tunnelUrl = url;
				webAddrUrl = uiUrl;
				done();
			});
			ngrok.connect().catch(done);
		});

		it('should fire "connect" event', function ( ) {
			expect(connected).to.be.true;
		});

		it('should pass tunnel url with a "connect" event', function ( ) {
			expect(tunnelUrl).to.match(/https:\/\/.(.*).ngrok.io/);
		});

		it.skip('should pass web ui url with a "connect" event', function ( ) {
			expect(webAddrUrl).to.match(/^http:\/\/127\.0\.0\.1:4040$/);
		});
	});

	describe('disconnecting from ngrok', function ( ) {
		var disconnected;
		before(function (done){
			ngrok.once('disconnect', function ( ) {
				disconnected = true;
				done();
			});	
			ngrok.disconnect().catch(done);
		});
		it('should fire "disconnect" event', function ( ) {
			expect(disconnected).to.be.true;
		});
	});

	describe.skip('connecting to ngrok with error', function(){
		var error;
		before(function (done) {
			ngrok.once('error', function ( err ) {
				error = err;
				done();
			});	
			ngrok.connect({proto: 'xxx'}).catch(() => {});
		});

		it('should fire error event', function(){
			expect(error).to.be.instanceof.Error;
		});
	});

});