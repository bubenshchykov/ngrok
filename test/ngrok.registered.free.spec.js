const ngrok = require("..");
const http = require("http");
const net = require("net");
const got = require("got");
const URL = require("url");
const util = require("./util");

const port = 8080;
const authtoken =
  process.env.NGROK_AUTHTOKEN_FREE ||
  "6oQGYSXQuj7hdWDfxbpp3_2hWhQtZSq8yiJZDETQLUc";
const localUrl = "http://127.0.0.1:" + port;
let tunnelUrl, respBody;

describe("registered.free.spec.js - setting free authtoken", function () {
  before(async () => {
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
          tunnelUrl = await ngrok.connect(port);
        });

        it("should return url pointing to ngrok domain", function () {
          expect(tunnelUrl).to.match(/https:\/\/.(.*).ngrok.io/);
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

            describe("calling local server through discconected ngrok", function () {
              before(function () {
                return got(tunnelUrl + "/ngrok")
                  .text()
                  .then((body) => (respBody = body))
                  .catch((err) => (respBody = err.response.body));
              });

              it("should return error message", function () {
                expect(respBody).to.match(/Tunnel (.)* (not found|is closing)/);
              });
            });
          });
        });
      });

      describe("connecting to ngrok with auth", function () {
        before(async () => {
          tunnelUrl = await ngrok.connect({
            port: port,
            auth: "oki:doki",
          });
        });

        it("should return url pointing to ngrok domain", function () {
          expect(tunnelUrl).to.match(/https:\/\/.(.*).ngrok.io/);
        });

        describe("calling local server through ngrok without http authorization", function () {
          before(function () {
            return got(tunnelUrl + "/ngrok-httpauth")
              .text()
              .then((body) => (respBody = body))
              .catch((err) => (respBody = err.response.body));
          });

          it("should return error message", function () {
            expect(respBody).to.contain("Authorization Failed");
          });
        });

        describe("calling local server through ngrok with http authorization", function () {
          before(function () {
            return got(tunnelUrl + "/ngrok-httpauth", {
              username: "oki",
              password: "doki",
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
});
