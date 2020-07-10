const ngrok = require('..');

describe('getting the version', function() {
  it('should return a version string like x.y.z', async function() {
    const version = await ngrok.getVersion();
    expect(version).to.match(/^\d+\.\d+\.\d+$/)
  })
});