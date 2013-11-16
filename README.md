ngrok
=====

simple node wrapper for ngrok client
exposes localhost to the web
https://ngrok.com/

usage
====

```javascript
var ngrok = require('ngrok');
ngrok.connect({port: 80, log: true}, function (err, url) {
  console.log('got nkgrok url', url);
});
```
or
```javascript
ngrok.disconnect();
```
