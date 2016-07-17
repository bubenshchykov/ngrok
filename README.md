ngrok [![Build Status](https://travis-ci.org/bubenshchykov/ngrok.png?branch=master)](https://travis-ci.org/bubenshchykov/ngrok)
=====

![alt ngrok.com](https://ngrok.com/static/img/overview.png)

Ngrok exposes your localhost to the web. https://ngrok.com/

usage
===

[![NPM](https://nodei.co/npm/ngrok.png?global=true&&downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/ngrok/)

```
var ngrok = require('ngrok');
ngrok.connect(function (err, url) {});

or

npm install ngrok -g
ngrok http 8080
```

## authtoken
You can create basic http-https-tcp tunnel without authtoken. For custom subdomains and more you should  obtain authtoken by signing up at [ngrok.com](https://ngrok.com). Once you set it, it's stored in ngrok config and used for all tunnels. Few ways:

```
ngrok.authtoken(token, function(err, token) {});
ngrok.connect({authtoken: token, ...}, function (err, url) {});
ngrok authtoken <token>
```

## connect
```javascript
var ngrok = require('ngrok');

ngrok.connect(function (err, url) {}); // https://757c1652.ngrok.io -> http://localhost:80
ngrok.connect(9090, function (err, url) {}); // https://757c1652.ngrok.io -> http://localhost:9090
ngrok.connect({proto: 'tcp', addr: 22}, function (err, url) {}); // tcp://0.tcp.ngrok.io:48590
ngrok.connect(opts, function(err, url) {});
```

## options
```javascript
ngrok.connect({
	proto: 'http', // http|tcp|tls
	addr: 8080, // port or network address
	auth: 'user:pwd', // http basic authentication for tunnel
	subdomain: 'alex', // reserved tunnel name https://alex.ngrok.io
	authtoken: '12345', // your authtoken from ngrok.com
	region: 'us' // one of ngrok regions (us, eu, au, ap), defaults to us
}, function (err, url) {});
```

Other options: `name, inspect, host_header, bind_tls, hostname, crt, key, client_cas, remote_addr` - read [here](https://ngrok.com/docs)

Note on regions: region used in first tunnel will be used for all next tunnels too.

## disconnect
The ngrok and all tunnels will be killed when node process is done. To stop the tunnels use
```javascript
ngrok.disconnect(url); // stops one
ngrok.disconnect(); // stops all
ngrok.kill(); // kills ngrok process
```

Note on http tunnels: by default bind_tls is true, so whenever you use http proto two tunnels are created - http and https. If you disconnect https tunnel, http tunnel remains open. You might want to close them both by passing http-version url, or simply by disconnecting all in one go ```ngrok.disconnect()```.

## emitter
Also you can use ngrok as an event emitter, it fires "connect", "disconnect" and "error" events
```javascript
ngrok.once('connect', function (url) {};
ngrok.connect(port);
```

## configs
You can use ngrok's [configurations files](https://ngrok.com/docs#config), then just pass `name` option when making a tunnel. Configuration files allow to specify more options, eg ngrok region you want to use.
```
OS X	/Users/example/.ngrok2/ngrok.yml
Linux	/home/example/.ngrok2/ngrok.yml
Windows	C:\Users\example\.ngrok2\ngrok.yml
```

## inspector
When tunnel is established you can use the ngrok interface http://127.0.0.1:4040 to inspect the webhooks done via ngrok.

## how it works
npm install downloads ngrok binaries for you platform and puts them into bin folder. You can host binaries yourself and set NGROK_CDN_URL env var before installing ngrok. Or you can force specific arch by setting NGROK_ARCH, eg NGROK_ARCH=freebsdia32

First time you create tunnel ngrok process is spawned and runs until you disconnect or when parent process killed. All further tunnels are created or stopped by using internal ngrok api which usually runs on http://127.0.0.1:4040

## contributors
Please run ```git update-index --assume-unchanged bin/ngrok``` to not override [ngrok stub](https://github.com/bubenshchykov/ngrok/blob/master/bin/ngrok) in your pr. Unfortunately it can't be gitignored.
