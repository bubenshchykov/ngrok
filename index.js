const got = require('got');
const uuid = require('uuid');
const {getProcess, killProcess, setAuthtoken, getVersion} = require('./process');

let processUrl = null;
let internalApi = null;
let tunnels = {};

async function connect (opts) {
  opts = defaults(opts);
  validate(opts);
  if (opts.authtoken) {
    await setAuthtoken(opts);
  }

  processUrl = await getProcess(opts);
  internalApi = got.extend({
    prefixUrl: processUrl,
    retry: 0
  });
  return connectRetry(opts);
}

function defaults (opts) {
  opts = opts || {proto: 'http', addr: 80}
  if (typeof opts === 'function') opts = {proto: 'http', addr: 80};
  if (typeof opts !== 'object') opts = {proto: 'http', addr: opts};
  if (!opts.proto) opts.proto = 'http';
  if (!opts.addr) opts.addr = opts.port || opts.host || 80;
  if (opts.httpauth) opts.auth = opts.httpauth;
  return opts
}

function validate  (opts) {
  if (opts.web_addr === false || opts.web_addr === 'false') {
    throw new Error('web_addr:false is not supported, module depends on internal ngrok api')
  }
}

async function connectRetry (opts, retryCount = 0) {
  opts.name = String(opts.name || uuid.v4());
  try {
    const response = await internalApi.post('api/tunnels', {json: opts}).json();
    const publicUrl = response.public_url;
    if (!publicUrl) {
      throw new Error('failed to start tunnel');
    }
    tunnels[publicUrl] = response.uri;
    if (opts.proto === 'http' && opts.bind_tls !== false) {
      tunnels[publicUrl.replace('https', 'http')] = response.uri + ' (http)';
    }
    return publicUrl;
  } catch (err) {
    if (!isRetriable(err) || retryCount >= 100) {
      if (err.response) {
        throw JSON.parse(err.response.body);
      }
      throw err.error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    return connectRetry(opts, ++retryCount);
  }
 }

function isRetriable (err) {
  if (!err.response) return false;
  const body = JSON.parse(err.response.body);
  const notReady500 = err.response.statusCode === 500 && /panic/.test(body)
  const notReady502 = err.response.statusCode === 502 && body.details && body.details.err === 'tunnel session not ready yet';
  const notReady503 = err.response.statusCode === 503 && body.details && body.details.err === 'a successful ngrok tunnel session has not yet been established';
  return notReady500 || notReady502 || notReady503;
}

async function disconnect (publicUrl) {
  if (!internalApi) return;
  if (!publicUrl) {
  	const disconnectAll = Object.keys(tunnels).map(disconnect);
  	return Promise.all(disconnectAll);
  }
  const tunnelUrl = tunnels[publicUrl];
  if (!tunnelUrl) {
    throw new Error(`there is no tunnel with url: ${publicUrl}`)
  }
  await internalApi.delete(tunnelUrl.replace(/^\//, ''))
  delete tunnels[publicUrl];
}

async function kill ()  {
  if (!internalApi) return;
  await killProcess();
  internalApi = null;
  tunnels = {}
}

function getUrl() {
  return processUrl;
}

function getApi() {
  return internalApi;
}

module.exports = {
  connect,
  disconnect,
  authtoken: setAuthtoken,
  kill,
  getUrl,
  getApi,
  getVersion
};
