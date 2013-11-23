ngrok [![Build Status](https://travis-ci.org/bubenshchykov/ngrok.png?branch=master)](https://travis-ci.org/bubenshchykov/ngrok)
=====

Simple node wrapper for ngrok client. Ngrok exposes localhost to the web. https://ngrok.com/
```shell
$ npm install ngrok
```
usage
====
Require ngrok and call connect method with a port and callback function:

```javascript
var ngrok = require('ngrok');

ngrok.connect(8080, function (err, url) {
  console.log('got ngrok url', url);
});
```
You may want to use more advanced ngrok options:
```javascript
var ngrok = require('ngrok');

ngrok.connect({
	authoken: 'your-token',
	subdomain: 'fixed-domain',
	httpauth: 'user:password',
	port: 22,
	proto: 'tcp'
}, function (err, url) {
  console.log('got ngrok url', url);
});
```

When tunnel is established you can use http://127.0.0.1:4040/http/in to inspect the webhooks done via ngrok.

The tunnel will be killed when node process is done. For manual shutdown use

```javascript
ngrok.disconnect();
```

next
=====
* add support for ngrok config file and running multiple ngrok clients
* add negative tests
* rewrite entire ngrok client with node :)