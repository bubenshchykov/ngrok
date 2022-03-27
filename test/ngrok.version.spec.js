const ngrok = require("..");
const { getVersion } = require("../src/version");

describe("getting the version", function () {
  it("should return a version string like x.y.z", async function () {
    const version = await getVersion();
    expect(version).to.match(/^\d+\.\d+\.\d+/);
  });
});
