# ngrok [![Tests](https://github.com/bubenshchykov/ngrok/workflows/Tests/badge.svg)](https://github.com/bubenshchykov/ngrok/actions) ![TypeScript compatible](https://img.shields.io/badge/typescript-compatible-brightgreen.svg) [![npm](https://img.shields.io/npm/v/ngrok.svg)](https://www.npmjs.com/package/ngrok) [![npm](https://img.shields.io/npm/dm/ngrok.svg)](https://www.npmjs.com/package/ngrok)

This project is the Node.js wrapper for the [ngrok client](https://ngrok.com/download). Version 5 of this project uses ngrok client version 3. For ngrok client version 2, check out version 4.

![alt ngrok.com](https://ngrok.com/static/img/overview.png)

* [Usage](#usage)
  * [Local install](#local-install)
  * [Global install](#global-install)
  * [Auth Token](#auth-token)
  * [Connect](#connect)
    * [Options](#options)
  * [Disconnect](#disconnect)
  * [Config](#config)
    * [Updating config for ngrok version 3](#updating-config-for-ngrok-version-3)
  * [Inspector](#inspector)
  * [API](#api)
    * [List tunnels](#list-tunnels)
    * [Start tunnel](#start-tunnel)
    * [Get tunnel details](#get-tunnel-details)
    * [Stop tunnel](#stop-tunnel)
    * [List requests](#list-requests)
    * [Replay request](#replay-request)
    * [Delete all requests](#delete-all-requests)
    * [Request detail](#request-detail)
  * [Proxy](#proxy)
* [How it works](#how-it-works)
* [ngrok binary update](#ngrok-binary-update)
* [Using with nodemon](#using-with-nodemon)
* [Contributors](#contributors)
* [Upgrading to version 5](#upgrading-to-version-5)
  * [Config](#config-1)
  * [Connect options](#connect-options)
* [Upgrading to version 4](#upgrading-to-version-4)
  * [TypeScript](#typescript)

## Usage

### Local install

Install the package with npm:

```bash
npm install ngrok
```

Then use `ngrok.connect()` to start ngrok and open a tunnel.

```javascript
const ngrok = require('ngrok');
(async function() {
  const url = await ngrok.connect();
})();
```

This module uses `node>=10.19.0` with async/await. For a callback-based version use [2.3.0](https://github.com/bubenshchykov/ngrok/blob/330674233e3ec77688bb692bf1eb007810c4e30d/README.md).

### Global install

```bash
npm install ngrok -g
ngrok http 8080
```

For global install on Linux, you might need to run `sudo npm install --unsafe-perm -g ngrok` due to the [nature](https://github.com/bubenshchykov/ngrok/issues/115#issuecomment-380927124) of npm postinstall script.

### Auth Token
You can create basic http-https-tcp tunnel without an [authtoken](https://ngrok.com/docs#authtoken). For custom subdomains and more you should obtain an authtoken by [signing up at ngrok.com](https://ngrok.com). Once you set the authtoken, it is stored in ngrok config and used for all tunnels. You can set the authtoken directly:

```javascript
await ngrok.authtoken(token);
```

Or pass the authtoken to the `connect` method like so:

```javascript
await ngrok.connect({authtoken: token, ...});
```

### Connect

There are a number of ways to create a tunnel with ngrok using the `connect` method.

By default, `connect` will open an HTTP tunnel to port 80

```javascript
const url = await ngrok.connect(); // https://757c1652.ngrok.io -> http://localhost:80
```

You can pass the port number to `connect` to specify that port:

```javascript
const url = await ngrok.connect(9090); // https://757c1652.ngrok.io -> http://localhost:9090
```

Or you can pass an object of options, for example:

```javascript
const url = await ngrok.connect({proto: 'tcp', addr: 22}); // tcp://0.tcp.ngrok.io:48590
const url = await ngrok.connect(opts);
```

#### Options

There are many options that you can pass to `connect`, here are some examples:

```javascript
const url = await ngrok.connect({
  proto: 'http', // http|tcp|tls, defaults to http
  addr: 8080, // port or network address, defaults to 80
  basic_auth: 'user:pwd', // http basic authentication for tunnel
  subdomain: 'alex', // reserved tunnel name https://alex.ngrok.io
  authtoken: '12345', // your authtoken from ngrok.com
  region: 'us', // one of ngrok regions (us, eu, au, ap, sa, jp, in), defaults to us
  configPath: '~/git/project/ngrok.yml', // custom path for ngrok config file
  binPath: path => path.replace('app.asar', 'app.asar.unpacked'), // custom binary path, eg for prod in electron
  onStatusChange: status => {}, // 'closed' - connection is lost, 'connected' - reconnected
  onLogEvent: data => {}, // returns stdout messages from ngrok process
});
```

See [the ngrok documentation for all of the tunnel definition options](https://ngrok.com/docs/ngrok-agent/config#config-ngrok-tunnel-definitions) including: `name, inspect, host_header, scheme, hostname, crt, key, remote_addr`.

Note on regions:

* The region used in the first tunnel will be used for all the following tunnels
* If you do not provide a region, ngrok will try to pick the closest one to your location. This will include the region in the URL. To get a URL without a region, set the region to "us".

### Disconnect

The ngrok process and all tunnels will be killed when node process is complete. To stop the tunnels manually use:

```javascript
await ngrok.disconnect(url); // stops one
await ngrok.disconnect(); // stops all
await ngrok.kill(); // kills ngrok process
```

### Config

You can use ngrok's [configurations files](https://ngrok.com/docs#config), and pass `name` option when making a tunnel. Configuration files allow to store tunnel options. Ngrok looks for them here:

| System         | Path                                              |
| -------------- | ------------------------------------------------- |
| MacOS (Darwin) | `"~/Library/Application Support/ngrok/ngrok.yml"` |
| Linux          | `"~/.config/ngrok/ngrok.yml"`                     |
| Windows        | `"%HOMEPATH%\AppData\Local\ngrok\ngrok.yml"`      |

You can specify a custom `configPath` when making a tunnel.

#### Updating config for ngrok version 3

With the upgrade to ngrok version 3, an older config file will no longer be compatible without a few changes. The ngrok agent provides a [command to upgrade your config](https://ngrok.com/docs/ngrok-agent/ngrok#command-ngrok-config-upgrade). On the command line you can run:

```
ngrok config upgrade
```

The default locations of the config file have changed too, you can upgrade and move your config file with the command:

```
ngrok config upgrade --relocate
```

The library makes this command available as well. To get the same effect you can run:

```js
await ngrok.upgradeConfig();

// relocate the config file too:
await ngrok.upgradeConfig({ relocate: true });
```

### Inspector

When a tunnel is established you can use the ngrok interface hosted at http://127.0.0.1:4040 to inspect the webhooks made via ngrok.

The same URL hosts the internal [client api](https://ngrok.com/docs#client-api). This package exposes an API client that wraps the API which you can use to manage tunnels yourself.

```javascript
const url = await ngrok.connect();
const api = ngrok.getApi();
const tunnels = await api.listTunnels();
```

You can also get the URL of the internal API:

```javascript
const url = await ngrok.connect();
const apiUrl = ngrok.getUrl();
```

### API

The API wrapper gives access to all the [ngrok client API](https://ngrok.com/docs#client-api) methods:

```javascript
const url = await ngrok.connect();
const api = ngrok.getApi();
```

#### [List tunnels](https://ngrok.com/docs#list-tunnels)

```javascript
const tunnels = await api.listTunnels();
```

#### [Start tunnel](https://ngrok.com/docs#start-tunnel)

```javascript
const tunnel = await api.startTunnel(opts);
```

#### [Get tunnel details](https://ngrok.com/docs#tunnel-detail)

```javascript
const tunnel = await api.tunnelDetail(tunnelName);
```

#### [Stop tunnel](https://ngrok.com/docs#stop-tunnel)

```javascript
await api.stopTunnel(tunnelName);
```

#### [List requests](https://ngrok.com/docs#list-requests)

```javascript
await api.listRequests(options);
```

#### [Replay request](https://ngrok.com/docs#replay-request)

```javascript
await api.replayRequest(requestId, tunnelName);
```

#### [Delete all requests](https://ngrok.com/docs#delete-requests)

```javascript
await api.deleteAllRequests();
```

#### [Request detail](https://ngrok.com/docs#request-detail)

```javascript
const request = await api.requestDetail(requestId);
```

### Proxy

- If you are behind a corporate proxy and have issues installing ngrok, you can set `HTTPS_PROXY` env var to fix it. ngrok's postinstall scripts uses the [`got`](https://www.npmjs.com/package/got) module to fetch the binary and the [`hpagent`](https://github.com/delvedor/hpagent) module to support HTTPS proxies. You will need to install the `hpagent` module as a dependency
- If you are using a CA file, set the path in the environment variable `NGROK_ROOT_CA_PATH`. The path is needed for downloading the ngrok binary in the postinstall script

## How it works

`npm install` downloads the ngrok binary for your platform from the official ngrok hosting. To host binaries yourself set the `NGROK_CDN_URL` environment variable before installing ngrok. To force specific platform set `NGROK_ARCH`, eg `NGROK_ARCH=freebsdia32`.

The first time you create a tunnel the ngrok process is spawned and runs until you disconnect or when the parent process is killed. All further tunnels are connected or disconnected through the internal ngrok API which usually runs on http://127.0.0.1:4040.

## ngrok binary update

If you would like to force an update of the ngrok binary directly from your software, you can require the `ngrok/download` module and call the `downloadNgrok` function directly:

```javascript
const downloadNgrok = require('ngrok/download');
downloadNgrok(myCallbackFunc, { ignoreCache: true });
```

## Using with nodemon

If you want your application to restart as you make changes to it, you may use [nodemon](https://nodemon.io/). This blog post shows [how to use nodemon and ngrok together so your server restarts but your tunnel doesn't](https://philna.sh/blog/2021/03/15/restart-app-not-tunnel-ngrok-nodemon/).

## Contributors

Please run `git update-index --assume-unchanged bin/ngrok` to not override [ngrok stub](https://github.com/bubenshchykov/ngrok/blob/master/bin/ngrok) in your PR. Unfortunately it can't be gitignored.

The test suite covers the basic usage without an authtoken, as well as features available for free and paid authtokens. You can supply your own tokens as environment variables, otherwise a warning is given and some specs are ignored (locally and in PR builds). GitHub Actions supplies real tokens to master branch and runs all specs always.

## Upgrading to version 5

Please read the [upgrade notes for the ngrok agent](https://ngrok.com/docs/guides/upgrade-v2-v3). Library specific changes are described below and there is more in the [CHANGELOG](./CHANGELOG.md):

### Config 

The format and default location of the config file has changed. Please see the section on [upgrading your config file](#updating-config-for-ngrok-version-3) for more detail.

### Connect options

The `bind_tls` option is now `scheme`. When `bind_tls` was true (the default), ngrok agent version 2 would start two tunnels, one on `http` and one on `https`. Now, when `scheme` is set to `https` (the default), only an `https` tunnel will be created. To create both tunnels, you will need to pass `["http", "https"]` as the `scheme` option.

The `auth` option, also available as `httpauth`, is now just `basic_auth`. Note also that the password for `basic_auth` must be between 8 and 128 characters long.

## Upgrading to version 4

The main impetus to update the package was to remove the dependency on the deprecated `request` module. `request` was replaced with `got`. Calls to the main `ngrok` functions, `connect`, `authtoken`, `disconnect`, `kill`, `getVersion` and `getUrl` respond the same as in version 3.

Updating the HTTP library, meant that the wrapped API would change, so a client class was created with methods for the available API calls. See the documentation above [for how to use the API client](#api).

The upside is that you no longer have to know the path to the API method you need. For example, to list the active tunnels in version 3 you would do:

```javascript
const api = ngrok.getApi();
const tunnels = await api.get('api/tunnels');
```

Now you can call the `listTunnels` function:

```javascript
const api = ngrok.getApi();
const tunnels = await api.listTunnels();
```

### TypeScript

From version 3 to version 4 the bundled types were also overhauled. Most types live within the `Ngrok` namespace, particularly `Ngrok.Options` which replaces `INgrokOptions`.