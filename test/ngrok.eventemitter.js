var ngrok = require('..');
var port = 8080;
var authtoken = '9qh-WUj4noglhhjqe_-Q';
ngrok.disconnect();


describe('eventemitters', function ( ) {

	describe('connect event', function ( ) {
		var connected;
		before(function(done) {
			ngrok.once('connect', function () {
				connected = true;
				done();
			});
			ngrok.connect( port );
		});

		it('should fire when ngrok.connect is called', function ( ) {
			expect(connected).to.be.true;
		});
	});

	describe('disconnect event', function ( ) {
		var disconnected;
		before(function(done){
			ngrok.once('disconnect', function ( ) {
				disconnected = true;
				done();
			});	
			ngrok.disconnect();
		});
		it('should fire the disconnect event when calling ngrok.disconnect', function ( ) {
			expect(disconnected).to.be.true;
		});
	});

	describe('error event', function(){
		var error;
		before(function(done){
			ngrok.once('error', function ( err ) {
				error = err;
				done();
			});	
			ngrok.connect({});
		});

		it('should fire when a bad param is given', function(){
			expect(error).to.be.an.Object;
		});
	})

});