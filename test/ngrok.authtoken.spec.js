const { expect } = require("chai");
const ngrok = require("..");
const http = require("http");
const got = require("got").default;
const uuid = require("uuid");
const util = require("./util");

const port = 8080;
const authtoken = process.env.NGROK_AUTHTOKEN_PAID;
let tunnelUrl, respBody;

(authtoken ? describe : describe.skip)(
  "authtoken.spec.js - ensuring no authtoken set",
  function () {
    before(async () => {
      await ngrok.kill();
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

      describe("connecting to ngrok with authtoken and subdomain", function () {
        const uniqDomain = "koko-" + uuid.v4();

        before(async () => {
          tunnelUrl = await ngrok.connect({
            port: port,
            subdomain: uniqDomain,
            authtoken: authtoken,
            region: "us",
          });
        });

        it("should return ngrok url with a given subdomain", function () {
          expect(tunnelUrl).to.equal("https://" + uniqDomain + ".ngrok.io");
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
      });
    });
  }
);
