ngrok [![Build Status](https://travis-ci.org/bubenshchykov/ngrok.png?branch=master)](https://travis-ci.org/bubenshchykov/ngrok)
=====

![alt ngrok.com](https://ngrok.com/static/img/overview.png)

Ngrok exposes your localhost to the web. https://ngrok.com/

usage
===

[![NPM](https://nodei.co/npm/ngrok.png?global=true&&downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/ngrok/)

It will download the ngrok 2.0 binary for your platform and put it into the bin folder. You can also install ngrok globally and use it directly from bash
```shell
$ npm install ngrok -g
$ ngrok http 8080
```

## basic
```javascript
var ngrok = require('ngrok');

ngrok.connect(function (err, url) {
	// https://757c1652.ngrok.io -> 127.0.0.1:8080 
});

ngrok.connect(9090, function (err, url) {
	// https://757c1652.ngrok.io -> 127.0.0.1:9090 
});

ngrok.connect({proto: 'tcp', addr: 22}, function (err, url) {
	// tcp://0.tcp.ngrok.io:48590 -> 127.0.0.1:22
});

First connect spawns the ngrok process so each next tunnel is created much faster.

```
## options
```javascript
ngrok.connect({
	proto: 'http', // http|tcp|tls
	addr: 8080, // port or network address
	auth: 'user:pwd', // http basic authentication for tunnel
	subdomain: 'alex', // reserved tunnel name https://alex.ngrok.io,
	authtoken: '12345' // your authtoken from ngrok.com
}, function (err, url) {});
```

Other options: `inspect, host_header, bind_tls, hostname, crt, key, client_cas, remote_addr` - read [https://ngrok.com/docs](here)

## disconnect
The ngrok and all tunnels will be killed when node process is done. Just to stop the tunnels use
```javascript
ngrok.disconnect(); // stops all
ngrok.disconnect(url); // stops one
ngrok.kill(); // kills the ngrok process
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

## authtoken
Many advanced features of the ngrok.com service require that you sign up for an account and use authtoken. The authtoken you specify is not the same as the one you used for ngrok 1.0 - module versions prior to 0.2. Your 2.0 ngrok authtoken is available on your ngrok 2.0 dashboard.

