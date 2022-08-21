const { promisify } = require("util");
const { exec: execCallback } = require("child_process");
const { join } = require("path");

const exec = promisify(execCallback);
const { defaultDir, bin } = require("./constants");

/**
 * @param {Ngrok.Options | undefined} opts
 * @returns Promise<string>
 */
async function getVersion(opts = {}) {
  let dir = defaultDir;
  if (opts.binPath) {
    dir = opts.binPath(dir);
  }
  const { stdout } = await exec(`${join(dir, bin)} --version`);
  return stdout.replace("ngrok version", "").trim();
}

module.exports = { getVersion };
