const { spawn } = require("child_process");
const { join } = require("path");
const { defaultDir, bin } = require("./constants");

/**
 *
 * Upgrades ngrok config file for use with ngrok version 3. See https://ngrok.com/docs/guides/upgrade-v2-v3#upgrading-the-ngrok-agent-config for more details
 *
 * @param {Object} opts - Options for upgrading your config file
 * @param {boolean} opts.relocate - Whether to relocate your config to the default directory
 * @param {string} opts.configPath - The path to your config file
 * @param {(defaultPath: string) => string} opts.binPath - Custom binary path, eg for prod in electron
 */
async function upgradeConfig(opts) {
  const command = ["config", "upgrade"];
  if (opts.relocate) {
    command.push("--relocate");
  }
  if (opts.configPath) {
    command.push(`--config=${opts.configPath}`);
  }

  let dir = defaultDir;
  if (opts.binPath) {
    dir = opts.binPath(dir);
  }
  const process = spawn(join(dir, bin), command, {
    windowsHide: true,
  });

  const killed = new Promise((resolve, reject) => {
    process.stdout.once("data", () => resolve());
    process.stderr.once("data", () =>
      reject(new Error("Error upgrading config"))
    );
  });

  try {
    return await killed;
  } finally {
    process.kill();
  }
}

module.exports = { upgradeConfig };
