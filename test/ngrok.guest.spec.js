const ngrok = require("..");
const http = require("http");
const got = require("got");
const uuid = require("uuid");
const util = require("./util");

const port = 8080;
const localUrl = "http://127.0.0.1:" + port;
let tunnelUrl, respBody, error;

describe("guest.spec.js - ensuring no authtoken set", function () {
  before(async function () {
    await ngrok.kill();
    util.removeAuthtoken();
  });

  describe("starting local http server", function () {
    let server;

    before(function (done) {
      server = http
        .createServer(function (req, res) {
          res.writeHead(200);
          res.end("oki-doki: " + req.url);
        })
        .listen(port, done);
    });

    after(function (done) {
      server.close(done.bind(null, null));
    });

    describe("calling local server directly", function () {
      before(function () {
        return got(localUrl + "/local")
          .text()
          .then((body) => (respBody = body));
      });

      it("should return oki-doki", function () {
        expect(respBody).to.equal("oki-doki: /local");
      });

      describe("connecting to ngrok with port specified", function () {
        before(async function () {
          tunnelUrl = await ngrok.connect(port);
        });

        it("should return url pointing to ngrok domain", function () {
          expect(tunnelUrl).to.match(/https:\/\/.(.*).ngrok.io/);
        });

        describe("getting internal url", () => {
          let url;
          before(() => (url = ngrok.getUrl()));
          it("should give you ngrok url", () => {
            expect(url).to.be.ok;
          });

          describe("getting tunnels via internal url", () => {
            let tunnelResponse;

            before(() => {
              return got(url + "/api/tunnels", { responseType: "json" })
                .json()
                .then((body) => (tunnelResponse = body));
            });

            it("should give you the open tunnel uri", () => {
              const firstTunnel = tunnelResponse.tunnels[0];
              expect(firstTunnel.uri).to.be.ok;
            });
          });
        });

        describe("getting internal api wrapper", () => {
          let api;
          before(() => (api = ngrok.getApi()));
          it("should give you ngrok api", () => {
            expect(api).to.be.ok;
          });
        });

        describe("calling local server through ngrok", function () {
          before(function () {
            return got(tunnelUrl + "/ngrok")
              .text()
              .then((body) => (respBody = body));
          });

          it("should return oki-doki too", function () {
            expect(respBody).to.equal("oki-doki: /ngrok");
          });

          describe("disconnecting from ngrok", function () {
            before(async function () {
              await ngrok.disconnect();
            });

            describe("calling local server through disconnected https ngrok", function () {
              before(function () {
                return got(tunnelUrl + "/ngrok").catch(
                  (err) => (respBody = err.response.body)
                );
              });

              it("should return error message", function () {
                expect(respBody).to.match(/Tunnel (.)* (not found|is closing)/);
              });
            });

            describe("calling local server through disconnected http ngrok", function () {
              before(function () {
                return got(tunnelUrl.replace("https", "http") + "/ngrok").catch(
                  (err) => (respBody = err.response.body)
                );
              });

              it("should return error message", function () {
                expect(respBody).to.match(/Tunnel (.)* (not found|is closing)/);
              });
            });
          });
        });
      });

      describe("connecting to ngrok with custom region", function () {
        before(async () => await ngrok.kill());

        before(async function () {
          tunnelUrl = await ngrok.connect({ region: "eu" });
        });

        it("should return url pointing to ngrok eu region", function () {
          expect(tunnelUrl).to.match(/https:\/\/.(.*).eu.ngrok.io/);
        });
      });

      describe("connecting to ngrok with subdomain", function () {
        const uniqDomain = "koko-" + uuid.v4();
        let error;

        before(async function () {
          try {
            await ngrok.connect({
              port: port,
              subdomain: uniqDomain,
            });
          } catch (err) {
            error = err;
          }
        });

        it("should return error", function () {
          expect(error.message).to.contain("failed to start tunnel");
          expect(error.body.details.err).to.contain(
            "Only paid plans may bind custom subdomains"
          );
        });
      });

      describe("connecting to ngrok with web_addr:false (disabling) ngrok api and ui)", function () {
        before(async function () {
          try {
            await ngrok.connect({ web_addr: false });
          } catch (err) {
            error = err;
          }
        });

        it("should return error", function () {
          expect(error.message).to.contain("web_addr:false is not supported");
        });
      });

      describe("connecting to ngrok with callbacks", function () {
        before(async () => await ngrok.kill());

        it("should be called with correct status", async function () {
          let resolve;
          const logMessages = [];
          const statusChangePromise = new Promise((res) => (resolve = res));
          await ngrok.connect({
            port,
            onLogEvent: (message) => logMessages.push(message),
            onStatusChange: (status) => {
              if (status === "connected") resolve();
            },
          });
          await statusChangePromise;
          expect(logMessages).to.not.be.empty;
        });
      });
    });

    after(async () => {
      await ngrok.kill();
    });
  });
});
