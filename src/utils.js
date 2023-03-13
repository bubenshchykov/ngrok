const { homedir, platform } = require("os");
const { join } = require("path");
const { parse } = require("yaml");
const { readFileSync } = require("fs");
const cloneDeep = require("lodash.clonedeep");

function normalizedPlatform() {
  const os = platform();
  if (os === "darwin" || os === "win32") {
    return os;
  } else {
    return "linux";
  }
}

function defaultConfigPath() {
  const home = homedir();
  const os = normalizedPlatform();
  const locations = {
    darwin: join(home, "Library", "Application Support", "ngrok", "ngrok.yml"),
    linux: join(home, ".config", "ngrok", "ngrok.yml"),
    win32: join(home, "AppData", "Local", "ngrok", "ngrok.yml"),
  };
  return locations[os];
}

function oldDefaultConfigPath() {
  const home = homedir();
  return join(home, ".ngrok2", "ngrok.yml");
}

const tunnelProperties = [
  "addr",
  "metadata",
  "basic_auth",
  "circuit_breaker",
  "host_header",
  "hostname",
  "inspect",
  "ip_restriction.allow_cidrs",
  "ip_restriction.deny_cidrs",
  "mutual_tls_cas",
  "oauth.allow_domains",
  "oauth.allow_emails",
  "oauth.scopes",
  "oauth.provider",
  "oidc.client_id",
  "oidc.client_secret",
  "oidc.scopes",
  "oidc.issuer_url",
  "proto",
  "proxy_proto",
  "request_header.add",
  "request_header.remove",
  "response_header.add",
  "response_header.remove",
  "schemes",
  "subdomain",
  "verify_webhook.provider",
  "verify_webhook.secret",
  "websocket_tcp_converter",
  "remote_addr",
  "crt",
  "key",
  "terminate_at",
  "labels",
];

const globalProperties = [
  "authtoken",
  "region",
  "web_addr",
  // used by the library
  "configPath",
  "binPath",
  "onLogEvent",
  "onStatusChange",
  "onTerminated",
];

function optsFromAvailable(opts, availableProperties) {
  const returnOpts = {};
  availableProperties.forEach((prop) => {
    if (opts.hasOwnProperty(prop)) {
      returnOpts[prop] = opts[prop];
    }
  });
  return returnOpts;
}

function defaults(opts) {
  if (typeof opts === "function") {
    opts = { proto: "http", addr: 80 };
  }
  if (typeof opts !== "object") {
    opts = { proto: "http", addr: opts };
  }
  opts = cloneDeep(opts) || { proto: "http", addr: 80 };
  let tunnelOpts = optsFromAvailable(opts, tunnelProperties);
  const globalOpts = optsFromAvailable(opts, globalProperties);
  if (opts.name) {
    const configPath = globalOpts.configPath || defaultConfigPath();
    const config = parse(readFileSync(configPath, "utf8"));
    if (config.tunnels && config.tunnels[opts.name]) {
      tunnelOpts = Object.assign(tunnelOpts, config.tunnels[opts.name]);
    }
  }
  if (!tunnelOpts.proto) {
    tunnelOpts.proto = "http";
  }
  if (!tunnelOpts.addr) {
    tunnelOpts.addr = opts.port || opts.host || 80;
  }
  if (
    tunnelOpts.hasOwnProperty("basic_auth") &&
    !Array.isArray(tunnelOpts.basic_auth)
  ) {
    tunnelOpts.basic_auth = [tunnelOpts.basic_auth];
  }
  return { tunnelOpts, globalOpts };
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
  defaultConfigPath,
  oldDefaultConfigPath,
};
