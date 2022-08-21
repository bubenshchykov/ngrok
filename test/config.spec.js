const { expect } = require("chai");
const ngrok = require("..");

const { join } = require("path");
const configPath = join("test", "fixtures", "old.yml");
const port = 8080;

describe("a config file without a version", () => {
  before(async function () {
    await ngrok.kill();
  });

  it("throws an error", async () => {
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
});
