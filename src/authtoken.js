const childProcess = require("child_process");
const { join } = require("path");

const { defaultDir, bin } = require("./constants");

function consolidateTokenAndOpts(optsOrToken) {
  const isOpts = typeof optsOrToken !== "string";
  const opts = isOpts ? optsOrToken : {};
  const token = isOpts ? opts.authtoken : optsOrToken;
  opts.authtoken = token;
  return opts;
}

async function setAuthtoken(optsOrToken) {
  const opts = consolidateTokenAndOpts(optsOrToken);

  const command = ["config", "add-authtoken", opts.authtoken];
  if (opts.configPath) {
    command.push("--config=" + opts.configPath);
  }

  let dir = defaultDir;
  if (opts.binPath) {
    dir = opts.binPath(dir);
  }
  const process = childProcess.spawn(join(dir, bin), command, {
    windowsHide: true,
  });

  const killed = new Promise((resolve, reject) => {
    process.stdout.once("data", () => resolve());
    process.stderr.once("data", () => reject(new Error("cant set authtoken")));
  });

  try {
    return await killed;
  } finally {
    process.kill();
  }
}

module.exports = { setAuthtoken };
