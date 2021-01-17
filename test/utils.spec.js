const { defaults, validate, isRetriable } = require("../src/utils");
const { join } = require("path");
const { expect } = require("chai");

const configPath = join("test", "fixtures", "ngrok.yml");

describe("utils", () => {
  describe("defaults", () => {
    it("sets default proto and addr with no arguments", () => {
      expect(defaults()).to.deep.equal({ proto: "http", addr: 80 });
    });

    it("sets the proto to http if the argument is not an object", () => {
      expect(defaults(8080)).to.deep.equal({ proto: "http", addr: 8080 });
    });

    it("sets the default proto and addr when passed a function", () => {
      expect(defaults(() => {})).to.deep.equal({ proto: "http", addr: 80 });
    });

    it("sets the proto to http if there is an addr, but no proto", () => {
      expect(defaults({ addr: 8080 })).to.deep.equal({
        proto: "http",
        addr: 8080,
      });
    });

    it("loads the config from the config file if a name is passed", () => {
      expect(
        defaults({
          configPath,
          name: "test",
        })
      ).to.deep.equal({
        addr: "3000",
        subdomain: "testtunnel",
        proto: "http",
      });
    });

    it("returns the defaults if the tunnel doesn't exist in the config", () => {
      expect(
        defaults({
          configPath,
          name: "nope",
        })
      ).to.deep.equal({
        addr: 80,
        proto: "http",
      });
    });

    it("throws an error if the configPath doesn't exist", () => {
      expect(() => {
        defaults({ configPath: "blah", name: "test" });
      }).to.throw(Error);
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
            err:
              "a successful ngrok tunnel session has not yet been established",
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
            err:
              "a successful ngrok tunnel session has not yet been established",
          },
        },
      };
      expect(isRetriable(error)).to.be.false;
    });
  });
});
