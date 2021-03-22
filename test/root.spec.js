/* tests are modifying default config file for ngrok
this root suite ensures that original config
is restored after tests run */

const homedir = require("homedir");
const path = require("path");
const fs = require("fs");

const configPath = path.join(homedir(), "/.ngrok2/ngrok.yml");
let configFile;
let configRestored;

const restoreConfig = (cb) => {
  if (!configFile) return cb();
  fs.writeFile(configPath, configFile, cb);
};

before((done) =>
  fs.readFile(configPath, (err, data) => {
    if (data) configFile = data;
    configRestored = true;
    done();
  })
);

after(restoreConfig);

process.on("exit", () => !configRestored && restoreConfig(() => {}));
