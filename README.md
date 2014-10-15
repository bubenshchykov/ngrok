ngrok [![Build Status](https://travis-ci.org/bubenshchykov/ngrok.png?branch=master)](https://travis-ci.org/bubenshchykov/ngrok)
=====

![alt ngrok.com](https://ngrok.com/static/img/overview.png)

Ngrok exposes your localhost to the web. https://ngrok.com/

usage
===

[![NPM](https://nodei.co/npm/ngrok.png?global=true&&downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/ngrok/)

It will download the ngrok binary for your platform and put it into the bin folder. You can also install ngrok globally and use it directly from bash
```shell
$ npm install ngrok -g
$ ngrok 8080
```

## basic

```javascript
var ngrok = require('ngrok');

ngrok.connect(8080, function (err, url) {
	// https://757c1652.ngrok.com -> 127.0.0.1:8080 
});
```
## subdomain
```javascript
ngrok.connect({
	authtoken: 'your-token',
	subdomain: 'susanna',
	port: 8080
}, function (err, url) {
	// https://susanna.ngrok.com -> 127.0.0.1:8080
});
```

## http auth
```javascript
ngrok.connect({
	authtoken: 'your-token',
	httpauth: 'user:pwd'
	port: 8080
}, function (err, url) {
	// https://757c1652.ngrok.com -> 127.0.0.1:8080 with http auth required
});
```

## tcp
```javascript
ngrok.connect({
	// http is the default protocol (and you should use it for the https
	// support) but tcp will work for everything else.
	authtoken: 'your-token',
	proto: 'tcp',
	port: 5672
}, function (err, url) {
	// tcp://abcd.ngrok.com:60234 -> 127.0.0.1:5762
});
```

## disconnect
The tunnel will be killed when node process is done. For manual shutdown use
```javascript
ngrok.disconnect();
```
## emitter

Also you can use ngrok as an event emitter, it fires "connect", "disconnect" and "error" events
```javascript
ngrok.once('connect', function (url) {
	console.log('got a tunnel url', url);
});

ngrok.connect(port);
```

## inspector
When tunnel is established you can use the ngrok interface http://127.0.0.1:4040 to inspect the webhooks done via ngrok.
