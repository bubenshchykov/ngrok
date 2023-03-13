/* The tests are modifying default config file for ngrok these global hooks
ensure that original config is restored after tests run */

const { oldDefaultConfigPath, defaultConfigPath } = require("../src/utils");
const fs = require("fs");

const oldConfigPath = oldDefaultConfigPath();
const configPath = defaultConfigPath();
let configFile, oldConfigFile, configRestored, oldConfigRestored;

const storeConfig = async () => {
  try {
    const data = await fs.readFileSync(configPath, { encoding: "utf-8" });
    configFile = data;
  } catch (error) {}
  try {
    const data = await fs.readFileSync(oldConfigPath, { encoding: "utf-8" });
    oldConfigFile = data;
  } catch (error) {}
};

const restoreConfig = async () => {
  if (configFile) {
    try {
      await fs.writeFileSync(configPath, configFile, { encoding: "utf-8" });
    } catch (error) {
      console.error(error);
      console.error(
        `Could not write your original config to disk at ${configPath}. The contents were:`
      );
      console.error(configFile);
    }
  }
  if (oldConfigFile) {
    try {
      await fs.writeFileSync(oldConfigPath, oldConfigFile, {
        encoding: "utf-8",
      });
    } catch (error) {
      console.error(error);
      console.error(
        `Could not write your original config to disk at ${oldConfigPath}. The contents were:`
      );
      console.error(oldConfigFile);
    }
  }
};

module.exports = {
  mochaHooks: {
    beforeEach: storeConfig,
    afterEach: restoreConfig,
  },
};

process.on("exit", () => restoreConfig());
