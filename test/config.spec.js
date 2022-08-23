const { expect } = require("chai");
const { parse } = require("yaml");
const ngrok = require("..");

const { join } = require("path");
const { readFileSync, writeFileSync, unlinkSync } = require("fs");
const configPath = join("test", "fixtures", "old.yml");
const backedUpConfigPath = join("test", "fixtures", "old.yml.v1.bak");
const port = 8080;

describe("a config file without a version", () => {
  before(async function () {
    await ngrok.kill();
  });

  it("throws an error when trying to connect", async () => {
    let error;
    try {
      await ngrok.connect({
        addr: port,
        configPath,
      });
    } catch (e) {
      error = e;
    }
    expect(error).not.to.be.undefined;
    expect(error).to.match(/Error reading configuration file/);
  });

  describe("with the upgradeConfig function", () => {
    let configContents;
    beforeEach(() => {
      configContents = readFileSync(configPath, "utf-8");
    });
    afterEach(() => {
      writeFileSync(configPath, configContents, "utf-8");
      try {
        unlinkSync(backedUpConfigPath);
      } catch (e) {}
    });

    it("can be upgraded", async () => {
      const oldConfig = parse(readFileSync(configPath, "utf-8"));
      expect(oldConfig.version).to.be.undefined;
      expect(oldConfig.region).to.be.undefined;
      await ngrok.upgradeConfig({ configPath });
      const config = parse(readFileSync(configPath, "utf-8"));
      expect(config.version).to.eq("2");
      expect(config.region).to.eq("us");
    });
  });
});
