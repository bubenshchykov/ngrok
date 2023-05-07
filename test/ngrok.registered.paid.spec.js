const { expect } = require("chai");
const ngrok = require("..");
const http = require("http");
const net = require("net");
const got = require("got").default;
const URL = require("url");
const uuid = require("uuid");
const util = require("./util");

const port = 8080;
const authtoken = process.env.NGROK_AUTHTOKEN_PAID;
const localUrl = "http://127.0.0.1:" + port;
let tunnelUrl, respBody;

(authtoken ? describe : describe.skip)(
  "registered.paid.spec.js - setting paid authtoken",
  function () {
    before(async function () {
      await ngrok.kill();
      await ngrok.authtoken(authtoken);
    });

    after(function () {
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
          before(async () => {
            tunnelUrl = await ngrok.connect({
              addr: port,
              region: "us",
            });
          });

          it("should return url pointing to ngrok domain", function () {
            expect(tunnelUrl).to.match(/https:\/\/.(.*).ngrok.app/);
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
              before(async () => await ngrok.disconnect());

              describe("calling local server through disconnected ngrok", function () {
                before(function () {
                  return got(tunnelUrl + "/ngrok")
                    .text()
                    .then((body) => (respBody = body))
                    .catch((err) => (respBody = err.response.body));
                });

                it("should return error message", function () {
                  expect(respBody).to.match(
                    /Tunnel (.)* (not found|is closing)/
                  );
                });
              });
            });
          });
        });

        describe("connecting to ngrok with subdomain", function () {
          const uniqDomain = "koko-" + uuid.v4();

          before(async () => {
            tunnelUrl = await ngrok.connect({
              port: port,
              subdomain: uniqDomain,
              region: "us",
            });
          });

          it("should return ngrok url with a given subdomain", function () {
            expect(tunnelUrl).to.equal("https://" + uniqDomain + ".ngrok.app");
          });

          describe("calling local server through ngrok", function () {
            before(function () {
              return got(tunnelUrl + "/ngrok-subdomain")
                .text()
                .then((body) => (respBody = body));
            });

            it("should return oki-doki too", function () {
              expect(respBody).to.equal("oki-doki: /ngrok-subdomain");
            });
          });

          describe("connecting to ngrok with same subdomain again", function () {
            let error;

            before(async () => {
              try {
                tunnelUrl = await ngrok.connect({
                  port: port,
                  subdomain: uniqDomain,
                });
              } catch (err) {
                error = err;
              }
            });

            it("should return an error that the tunnel is already established", function () {
              expect(error.message).to.equal("failed to start tunnel");
              expect(error.body.details.err).to.contain(
                "is already bound to another tunnel session"
              );
            });
          });

          describe("disconnecting from ngrok and connecting with same subdomain again", function () {
            let error;

            before(async () => await ngrok.disconnect());

            before(async () => {
              tunnelUrl = await ngrok.connect({
                region: "us",
                port: port,
                subdomain: uniqDomain,
              });
            });

            it("should be able to connect and return the same ngrok url", function () {
              expect(tunnelUrl).to.equal(
                "https://" + uniqDomain + ".ngrok.app"
              );
            });
          });
        });

        describe("connecting to ngrok with auth", function () {
          before(async () => {
            tunnelUrl = await ngrok.connect({
              port: port,
              basic_auth: "username:password",
            });
          });

          it("should return url pointing to ngrok domain", function () {
            expect(tunnelUrl).to.match(/https:\/\/.(.*).ngrok.app/);
          });

          describe("calling local server through ngrok without http authorization", function () {
            before(function () {
              return got(tunnelUrl + "/ngrok-httpauth")
                .text()
                .then((body) => (respBody = body))
                .catch((err) => (respBody = err.response.body));
            });

            it("should return error message", function () {
              expect(respBody).to.contain("401 Unauthorized");
            });
          });

          describe("calling local server through ngrok with http authorization", function () {
            before(function () {
              return got(tunnelUrl + "/ngrok-httpauth", {
                username: "username",
                password: "password",
              })
                .text()
                .then((body) => (respBody = body));
            });

            it("should return oki-doki too", function () {
              expect(respBody).to.equal("oki-doki: /ngrok-httpauth");
            });
          });
        });
      });
    });

    describe("starting local tcp server", function () {
      let tcpServerPort;
      before(function (done) {
        const tcpServer = net
          .createServer(function (socket) {
            socket.end("oki-doki: tcp");
          })
          .listen(0, "127.0.0.1", function () {
            tcpServerPort = tcpServer.address().port;
            done();
          });
      });

      describe("connecting to ngrok by tcp", function () {
        let tunnelUrlParts;
        before(async () => {
          tunnelUrl = await ngrok.connect({
            proto: "tcp",
            port: tcpServerPort,
          });
          tunnelUrlParts = URL.parse(tunnelUrl);
        });

        it("should return ngrok url with tcp protocol", function () {
          expect(tunnelUrlParts.protocol).to.equal("tcp:");
        });

        it("should return ngrok url with a port", function () {
          expect(tunnelUrlParts.port).to.be.ok;
        });

        describe("calling local tcp server through ngrok", function () {
          let socketData;
          let socket;

          before(function (done) {
            net
              .connect(+tunnelUrlParts.port, tunnelUrlParts.hostname)
              .once("data", function (data) {
                socketData = data.toString();
                done();
              })
              .on("error", Object);
          });

          it("should be able to connect through the tunnel", function () {
            expect(socketData).to.equal("oki-doki: tcp");
          });
        });
      });
    });
  }
);
