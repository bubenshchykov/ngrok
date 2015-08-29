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

## authtoken
*Attention, authtoken is required now because of tricky ngrok [bug #27](https://github.com/bubenshchykov/ngrok/issues/27).* Please go to ngrok 2.0 dashboard to obtain an authtoken. The one for ngrok 1.0 won't work. Many advanced features of the ngrok.com service require an authtoken, so it's a good thing anyway. As alternative, use module version 0.1.99 which uses ngrok 1.0 and doesn't require an authtoken.

You can pass it as option with each ```connect``` or set it once for further tunnels
```javascript
ngrok.authtoken(token, function(err, token) {});
```

## connect
```javascript
var ngrok = require('ngrok');

ngrok.connect(function (err, url) {}); // https://757c1652.ngrok.io -> http://localhost:80
ngrok.connect(9090, function (err, url) {}); // https://757c1652.ngrok.io -> http://localhost:9090
ngrok.connect({proto: 'tcp', addr: 22}, function (err, url) {}); // tcp://0.tcp.ngrok.io:48590
ngrok.connect(opts, function(err, url) {});
```
First connect spawns the ngrok process so each next tunnel is created much faster.

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

Other options: `name, inspect, host_header, bind_tls, hostname, crt, key, client_cas, remote_addr` - read [here](https://ngrok.com/docs)

## disconnect
The ngrok and all tunnels will be killed when node process is done. To stop the tunnels use
```javascript
ngrok.disconnect(url); // stops one
ngrok.disconnect(); // stops all
ngrok.kill(); // kills ngrok process
```

## emitter
Also you can use ngrok as an event emitter, it fires "connect", "disconnect" and "error" events
```javascript
ngrok.once('connect', function (url) {};
ngrok.connect(port);
```

## configs
You can use ngrok's [configurations files](https://ngrok.com/docs#config), then just pass `name` option when making a tunnel
```
OS X	/Users/example/.ngrok2/ngrok.yml
Linux	/home/example/.ngrok2/ngrok.yml
Windows	C:\Users\example\.ngrok2\ngrok.yml
```

## inspector
When tunnel is established you can use the ngrok interface http://127.0.0.1:4040 to inspect the webhooks done via ngrok.
