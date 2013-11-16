var ngrok = require('..');

describe('when connecting the localhost with ngrok', function(){
	var tunnelUrl;

	before(function (done) {
		ngrok.connect({}, function(err, url){
			tunnelUrl = url;
			done();
		});
	})

	it('should return tunnel url', function(){
		expect(tunnelUrl).not.to.be.empty;
	})
});