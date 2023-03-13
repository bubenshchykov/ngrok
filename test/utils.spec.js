const { expect } = require("chai");
const { defaults, validate, isRetriable } = require("../src/utils");
const { join } = require("path");

const configPath = join("test", "fixtures", "ngrok.yml");

describe("utils", () => {
  describe("defaults", () => {
    it("returns tunnel and global opts", () => {
      const opts = defaults();
      expect(opts).to.haveOwnProperty("tunnelOpts");
      expect(opts).to.haveOwnProperty("globalOpts");
    });

    describe("tunnelOpts", () => {
      it("sets default proto and addr with no arguments", () => {
        const { tunnelOpts } = defaults();
        expect(tunnelOpts).to.deep.equal({ proto: "http", addr: 80 });
      });

      it("sets the proto to http if the argument is not an object", () => {
        const { tunnelOpts } = defaults(8080);
        expect(tunnelOpts).to.deep.equal({ proto: "http", addr: 8080 });
      });

      it("sets the default proto and addr when passed a function", () => {
        const { tunnelOpts } = defaults(() => {});
        expect(tunnelOpts).to.deep.equal({ proto: "http", addr: 80 });
      });

      it("sets the proto to http if there is an addr, but no proto", () => {
        const { tunnelOpts } = defaults({ addr: 8080 });
        expect(tunnelOpts).to.deep.equal({
          proto: "http",
          addr: 8080,
        });
      });

      it("returns a copy of the argument", () => {
        const opts = { addr: 8080, proto: "http" };
        const { tunnelOpts } = defaults(opts);
        // Expects that the contents of the result are the same as the original
        // object
        expect(tunnelOpts).to.eql(opts);
        // Expects that the two objects are different, because result is a copy
        expect(tunnelOpts).not.to.equal(opts);
      });

      it("separates tunnel options from global options", () => {
        const opts = { addr: 8080, proto: "http", configPath, region: "au" };
        const { tunnelOpts, globalOpts } = defaults(opts);
        expect(tunnelOpts).to.deep.equal({ addr: 8080, proto: "http" });
        expect(globalOpts).to.deep.equal({ configPath, region: "au" });
      });

      it("loads the config from the config file if a name is passed", () => {
        const { tunnelOpts, globalOpts } = defaults({
          configPath,
          name: "test",
        });
        expect(tunnelOpts).to.deep.equal({
          addr: "3000",
          subdomain: "testtunnel",
          proto: "http",
        });
        expect(globalOpts).to.deep.equal({
          configPath,
        });
      });

      it("returns the defaults if the tunnel doesn't exist in the config", () => {
        const { tunnelOpts, globalOpts } = defaults({
          configPath,
          name: "nope",
        });
        expect(tunnelOpts).to.deep.equal({
          addr: 80,
          proto: "http",
        });
        expect(globalOpts).to.deep.equal({ configPath });
      });

      it("doesn't override config functions when loading from config", () => {
        const binPath = () => {};
        const onLogEvent = () => {};
        const onStatusChange = () => {};
        const onTerminated = () => {};
        const { tunnelOpts, globalOpts } = defaults({
          configPath,
          name: "test",
          binPath,
          onLogEvent,
          onStatusChange,
          onTerminated,
        });
        expect(tunnelOpts).to.deep.equal({
          addr: "3000",
          subdomain: "testtunnel",
          proto: "http",
        });
        expect(globalOpts).to.deep.equal({
          configPath,
          binPath,
          onLogEvent,
          onStatusChange,
          onTerminated,
        });
      });

      it("throws an error if the configPath doesn't exist", () => {
        expect(() => {
          defaults({ configPath: "blah", name: "test" });
        }).to.throw(Error);
      });
    });
  });

  describe("validate", () => {
    it("throws an error if opts try to set web_addr to false", () => {
      expect(() => {
        validate({ web_addr: false });
      }).to.throw(Error);
    });

    it("throws an error if opts try to set web_addr to 'false'", () => {
      expect(() => {
        validate({ web_addr: "false" });
      }).to.throw(Error);
    });

    it("does not throw an error with other opts", () => {
      expect(() => {
        validate({});
      }).to.not.throw();
    });
  });

  describe("isRetriable", () => {
    it("is retriable if the statusCode is 500 and the body is a string containing 'panic'", () => {
      const error = {
        response: {
          statusCode: 500,
        },
        body: "panic: runtime error",
      };
      expect(isRetriable(error)).to.be.true;
    });

    it("is retriable if the statusCode is 502 and the error is not ready", () => {
      const error = {
        response: {
          statusCode: 502,
        },
        body: {
          details: {
            err: "tunnel session not ready yet",
          },
        },
      };
      expect(isRetriable(error)).to.be.true;
    });

    it("is retriable if the statusCode is 503 and the error is not yet established", () => {
      const error = {
        response: {
          statusCode: 503,
        },
        body: {
          details: {
            err: "a successful ngrok tunnel session has not yet been established",
          },
        },
      };
      expect(isRetriable(error)).to.be.true;
    });

    it("is not retriable if the error doesn't have a response", () => {
      const error = {};
      expect(isRetriable(error)).to.be.false;
    });

    it("is not retriable for any other reason", () => {
      const error = {
        response: {
          statusCode: 502,
        },
        body: {
          details: {
            err: "a successful ngrok tunnel session has not yet been established",
          },
        },
      };
      expect(isRetriable(error)).to.be.false;
    });
  });
});
