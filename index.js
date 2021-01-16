const { NgrokClient } = require('./client');
const uuid = require('uuid');
const {getProcess, killProcess, setAuthtoken, getVersion} = require('./process');

let processUrl = null;
let ngrokClient = null;

async function connect (opts) {
  opts = defaults(opts);
  validate(opts);
  if (opts.authtoken) {
    await setAuthtoken(opts);
  }

  processUrl = await getProcess(opts);
  ngrokClient = new NgrokClient(processUrl);
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
    const response = await ngrokClient.startTunnel(opts);
    return response.public_url;
  } catch (err) {
    if (!isRetriable(err) || retryCount >= 100) {
      throw(err);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    return connectRetry(opts, ++retryCount);
  }
 }

function isRetriable (err) {
  if (!err.response){
    return false;
  }
  const statusCode = err.response.statusCode
  const body = err.body;
  const notReady500 = statusCode === 500 && /panic/.test(body)
  const notReady502 = statusCode === 502 && body.details && body.details.err === 'tunnel session not ready yet';
  const notReady503 = statusCode === 503 && body.details && body.details.err === 'a successful ngrok tunnel session has not yet been established';
  return notReady500 || notReady502 || notReady503;
}

async function disconnect (publicUrl) {
  if (!ngrokClient) return;
  const tunnels = (await ngrokClient.listTunnels()).tunnels;
  if (!publicUrl) {
  	const disconnectAll = tunnels.map(tunnel => disconnect(tunnel.public_url) );
  	return Promise.all(disconnectAll);
  }
  const tunnelDetails = tunnels.find(tunnel => tunnel.public_url === publicUrl);
  if (!tunnelDetails) {
    throw new Error(`there is no tunnel with url: ${publicUrl}`)
  }
  return ngrokClient.stopTunnel(tunnelDetails.name);
}

async function kill ()  {
  if (!ngrokClient) return;
  await killProcess();
  ngrokClient = null;
  tunnels = {}
}

function getUrl() {
  return processUrl;
}

function getApi() {
  return ngrokClient;
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
