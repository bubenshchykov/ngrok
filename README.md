ngrok [![Build Status](https://travis-ci.org/bubenshchykov/ngrok.png?branch=master)](https://travis-ci.org/bubenshchykov/ngrok)
=====

Simple node wrapper for ngrok client. Ngrok exposes your localhost to the web. https://ngrok.com/
```shell
$ npm install ngrok
```
usage
====
Just require ngrok and call connect method with a port and callback function:

```javascript
var ngrok = require('ngrok');

ngrok.connect(8080, function (err, url) {
	// https://757c1652.ngrok.com -> 127.0.0.1:8080 
});
```
Or you may want to use some of the advanced ngrok options like:
```javascript
var ngrok = require('ngrok');

ngrok.connect({
	authtoken: 'your-token',
	subdomain: 'susanna',
	httpauth: 'user:pwd',
	port: 8080
}, function (err, url) {
	// https://susanna.ngrok.com -> 127.0.0.1:8080 with http auth required
});
```

Or even create a tunnel that works based on protocols other then http.
```javascript
var ngrok = require('ngrok');

// create tunnel for your local amqp setup
ngrok.connect({
	// http is the default protocol (and you should use it for the https
	// support) but tcp will work for everything else.
	proto: 'tcp',
	authtoken: 'your-token',
	port: 5672
}, function (err, url) {
	// tcp://abcd.ngrok.com:60234 -> 127.0.0.1:5762
});
```



When tunnel is established you can use the ngrok interface http://127.0.0.1:4040 to inspect the webhooks done via ngrok.

The tunnel will be killed when node process is done. For manual shutdown use

```javascript
ngrok.disconnect();
```

next
=====
* add support for ngrok config file and running multiple ngrok clients
* add negative tests
* rewrite entire ngrok client with node :)
