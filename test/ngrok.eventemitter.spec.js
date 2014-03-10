var ngrok = require('..');
var port = 8080;
var authtoken = '9qh-WUj4noglhhjqe_-Q';
ngrok.disconnect();


describe('using ngrok as event emitter', function ( ) {

	describe('connecting to ngrok', function ( ) {
		var connected, tunnelUrl;
		before(function(done) {
			ngrok.once('connect', function (url) {
				connected = true;
				tunnelUrl = url;
				done();
			});
			ngrok.connect(port);
		});

		it('should fire "connect" event', function ( ) {
			expect(connected).to.be.true;
		});

		it('should pass tunnel url with a "connect" event', function ( ) {
			expect(tunnelUrl).to.match(/https:\/\/.(.*).ngrok.com/);
		});
	});

	describe('disconnecting from ngrok', function ( ) {
		var disconnected;
		before(function(done){
			ngrok.once('disconnect', function ( ) {
				disconnected = true;
				done();
			});	
			ngrok.disconnect();
		});
		it('should fire "disconnect" event', function ( ) {
			expect(disconnected).to.be.true;
		});
	});

	describe('connecting to ngrok with error', function(){
		var error;
		before(function(done){
			ngrok.once('error', function ( err ) {
				error = err;
				done();
			});	
			ngrok.connect({});
		});

		it('should fire error event', function(){
			expect(error).to.be.instanceof.Error;
		});
	});

});