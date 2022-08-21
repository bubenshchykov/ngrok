/// <reference path="./index.d.ts"/>

const { NgrokClient, NgrokClientError } = require("./src/client");
const uuid = require("uuid");
const { getProcess, killProcess } = require("./src/process");
const { getVersion } = require("./src/version");
const { setAuthtoken } = require("./src/authtoken");
const { upgradeConfig } = require("./src/config");

const {
  defaults,
  validate,
  isRetriable,
  defaultConfigPath,
  oldDefaultConfigPath,
} = require("./src/utils");

/**
 * @type string | null
 */
let processUrl = null;
/**
 * @type NgrokClient | null
 */
let ngrokClient = null;

/**
 *
 * @param {Object | string} opts
 * @returns Promise<string>
 */
async function connect(opts) {
  const { tunnelOpts, globalOpts } = defaults(opts);
  validate(globalOpts);

  processUrl = await getProcess(globalOpts);
  ngrokClient = new NgrokClient(processUrl);
  return connectRetry(tunnelOpts);
}

async function connectRetry(opts, retryCount = 0) {
  opts.name = String(opts.name || uuid.v4());
  try {
    const response = await ngrokClient.startTunnel(opts);
    return response.public_url;
  } catch (err) {
    if (!isRetriable(err) || retryCount >= 100) {
      throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    return connectRetry(opts, ++retryCount);
  }
}

/**
 *
 * @param {string} publicUrl
 * @returns Promise<void>
 */
async function disconnect(publicUrl) {
  if (!ngrokClient) return;
  const tunnels = (await ngrokClient.listTunnels()).tunnels;
  if (!publicUrl) {
    const disconnectAll = tunnels.map((tunnel) =>
      disconnect(tunnel.public_url)
    );
    return Promise.all(disconnectAll);
  }
  const tunnelDetails = tunnels.find(
    (tunnel) => tunnel.public_url === publicUrl
  );
  if (!tunnelDetails) {
    throw new Error(`there is no tunnel with url: ${publicUrl}`);
  }
  return ngrokClient.stopTunnel(tunnelDetails.name);
}

/**
 *
 * @returns Promise<void>
 */
async function kill() {
  if (!ngrokClient) return;
  await killProcess();
  ngrokClient = null;
}

/**
 *
 * @returns string | null
 */
function getUrl() {
  return processUrl;
}

/**
 *
 * @returns NgrokClient | null
 */
function getApi() {
  return ngrokClient;
}

module.exports = {
  connect,
  disconnect,
  authtoken: setAuthtoken,
  defaultConfigPath,
  oldDefaultConfigPath,
  upgradeConfig,
  kill,
  getUrl,
  getApi,
  getVersion,
  NgrokClient,
  NgrokClientError,
};
