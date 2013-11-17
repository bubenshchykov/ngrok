ngrok [![Build Status](https://travis-ci.org/bubenshchykov/ngrok.png?branch=master)](https://travis-ci.org/bubenshchykov/ngrok)
=====

Simple node wrapper for ngrok client. Ngrok exposes localhost to the web.

https://ngrok.com/

usage
====

```javascript
var ngrok = require('ngrok');

ngrok.connect({port: 80}, function (err, url) {
  console.log('got ngrok url', url);
});
```

When tunnel is established you can use http://127.0.0.1:4040/http/in to inspect the webhooks done via ngrok.

The tunnel will be killed when node process is done. For manual shutdown use

```javascript
ngrok.disconnect();
```
