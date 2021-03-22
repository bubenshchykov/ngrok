const { join } = require("path");
const fs = require("fs");
const child_process = require("child_process");

const postinstallPath = join(__dirname, "../postinstall.js");
const ngrokPath = join(__dirname, "fixtures", ".ngrok");
fs.mkdirSync(ngrokPath, { recursive: true });
const certpath = `${ngrokPath}/testCert.pem`;

describe("postinstall", () => {
  before(() => {
    process.env.NGROK_ROOT_CA_PATH = certpath;
    process.env.NGROK_IGNORE_CACHE = "true";
  });

  after(() => {
    delete process.env.NGROK_IGNORE_CACHE;
    delete process.env.NGROK_ROOT_CA_PATH;
  });

  describe("with no certificate", () => {
    before(() => {
      clearNgrokDirectory();
      writeJunkPemFile();
    });

    it("should run using a junk file without crashing", (done) => {
      const postinstall = child_process.fork(postinstallPath, {
        stdio: "ignore",
      });
      postinstall.on("exit", (code) => done(code));
    }).timeout(20000);
  });

  describe("with VerisignCertificate", () => {
    before(() => {
      clearNgrokDirectory();
      writeVerisignCertPemFile();
    });

    it("should fail to run with an invalid certificate", (done) => {
      const postinstall = child_process.fork(postinstallPath, {
        stdio: "ignore",
      });
      postinstall.on("exit", (code) => {
        expect(code).to.equal(1);
        done();
      });
    });
  });

  after(() => {
    clearNgrokDirectory();
  });
});

function clearNgrokDirectory() {
  const files = fs.readdirSync(ngrokPath);
  files.forEach((f) => fs.unlinkSync(join(ngrokPath, f)));
}

function writeJunkPemFile() {
  const pem = "junk data";
  fs.writeFileSync(certpath, pem, { flag: "w" });
}
function writeVerisignCertPemFile() {
  const pem = `-----BEGIN CERTIFICATE-----
MIIEuTCCA6GgAwIBAgIQQBrEZCGzEyEDDrvkEhrFHTANBgkqhkiG9w0BAQsFADCB
vTELMAkGA1UEBhMCVVMxFzAVBgNVBAoTDlZlcmlTaWduLCBJbmMuMR8wHQYDVQQL
ExZWZXJpU2lnbiBUcnVzdCBOZXR3b3JrMTowOAYDVQQLEzEoYykgMjAwOCBWZXJp
U2lnbiwgSW5jLiAtIEZvciBhdXRob3JpemVkIHVzZSBvbmx5MTgwNgYDVQQDEy9W
ZXJpU2lnbiBVbml2ZXJzYWwgUm9vdCBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTAe
Fw0wODA0MDIwMDAwMDBaFw0zNzEyMDEyMzU5NTlaMIG9MQswCQYDVQQGEwJVUzEX
MBUGA1UEChMOVmVyaVNpZ24sIEluYy4xHzAdBgNVBAsTFlZlcmlTaWduIFRydXN0
IE5ldHdvcmsxOjA4BgNVBAsTMShjKSAyMDA4IFZlcmlTaWduLCBJbmMuIC0gRm9y
IGF1dGhvcml6ZWQgdXNlIG9ubHkxODA2BgNVBAMTL1ZlcmlTaWduIFVuaXZlcnNh
bCBSb290IENlcnRpZmljYXRpb24gQXV0aG9yaXR5MIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEAx2E3XrEBNNti1xWb/1hajCMj1mCOkdeQmIN65lgZOIzF
9uVkhbSicfvtvbnazU0AtMgtc6XHaXGVHzk8skQHnOgO+k1KxCHfKWGPMiJhgsWH
H26MfF8WIFFE0XBPV+rjHOPMee5Y2A7Cs0WTwCznmhcrewA3ekEzeOEz4vMQGn+H
LL729fdC4uW/h2KJXwBL38Xd5HVEMkE6HnFuacsLdUYI0crSK5XQz/u5QGtkjFdN
/BMReYTtXlT2NJ8IAfMQJQYXStrxHXpma5hgZqTZ79IugvHw7wnqRMkVauIDbjPT
rJ9VAMf2CGqUuV/c4DPxhGD5WycRtPwW8rtWaoAljQIDAQABo4GyMIGvMA8GA1Ud
EwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMG0GCCsGAQUFBwEMBGEwX6FdoFsw
WTBXMFUWCWltYWdlL2dpZjAhMB8wBwYFKw4DAhoEFI/l0xqGrI2Oa8PPgGrUSBgs
exkuMCUWI2h0dHA6Ly9sb2dvLnZlcmlzaWduLmNvbS92c2xvZ28uZ2lmMB0GA1Ud
DgQWBBS2d/ppSEefUxLVwuoHMnYH0ZcHGTANBgkqhkiG9w0BAQsFAAOCAQEASvj4
sAPmLGd75JR3Y8xuTPl9Dg3cyLk1uXBPY/ok+myDjEedO2Pzmvl2MpWRsXe8rJq+
seQxIcaBlVZaDrHC1LGmWazxY8u4TB1ZkErvkBYoH1quEPuBUDgMbMzxPcP1Y+Oz
4yHJJDnp/RVmRvQbEdBNc6N9Rvk97ahfYtTxP/jgdFcrGJ2BtMQo2pSXpXDrrB2+
BxHw1dvd5Yzw1TKwg+ZX4o+/vqGqvz0dtdQ46tewXDpPaj+PwGZsY6rp2aQW9IHR
lRQOfc2VNNnSj3BzgXucfr2YYdhFh5iQxeuGMMY1v/D/w1WIg0vvBZIGcfK4mJO3
7M2CYfE45k+XmCpajQ==
-----END CERTIFICATE-----
`;
  fs.writeFileSync(certpath, pem, { flag: "w" });
}
