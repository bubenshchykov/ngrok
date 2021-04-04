const { homedir } = require("os");
const { join } = require("path");
const { parse } = require("yaml");
const { readFileSync } = require("fs");

function defaultConfigPath() {
  return join(homedir(), ".ngrok2", "ngrok.yml");
}

function defaults(opts) {
  opts = opts || { proto: "http", addr: 80 };
  if (opts.name) {
    const configPath = opts.configPath || defaultConfigPath();
    const config = parse(readFileSync(configPath, "utf8"));
    if (config.tunnels && config.tunnels[opts.name]) {
      opts = Object.assign(opts, config.tunnels[opts.name]);
    }
  }
  if (typeof opts === "function") opts = { proto: "http", addr: 80 };
  if (typeof opts !== "object") opts = { proto: "http", addr: opts };
  if (!opts.proto) opts.proto = "http";
  if (!opts.addr) opts.addr = opts.port || opts.host || 80;
  if (opts.httpauth) opts.auth = opts.httpauth;
  return opts;
}

function validate(opts) {
  if (opts.web_addr === false || opts.web_addr === "false") {
    throw new Error(
      "web_addr:false is not supported, module depends on internal ngrok api"
    );
  }
}

function isRetriable(err) {
  if (!err.response) {
    return false;
  }
  const statusCode = err.response.statusCode;
  const body = err.body;
  const notReady500 = statusCode === 500 && /panic/.test(body);
  const notReady502 =
    statusCode === 502 &&
    body.details &&
    body.details.err === "tunnel session not ready yet";
  const notReady503 =
    statusCode === 503 &&
    body.details &&
    body.details.err ===
      "a successful ngrok tunnel session has not yet been established";
  return notReady500 || notReady502 || notReady503;
}

module.exports = {
  defaults,
  validate,
  isRetriable,
};
