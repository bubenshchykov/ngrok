const { expect } = require("chai");
const sinon = require("sinon");

const version = require("../src/version");
const { defaultDir, bin } = require("../src/constants");
const { join } = require("path");
const childProcess = require("child_process");
const EventEmitter = require("events");

const { setAuthtoken } = require("../src/authtoken");

describe("setting the auth token", () => {
  let fakeChild = {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    kill: sinon.stub(),
  };
  let spawn;

  beforeEach(function () {
    spawn = sinon.stub(childProcess, "spawn").returns(fakeChild);
  });

  afterEach(function () {
    sinon.restore();
  });

  describe("for v3 ngrok binary", () => {
    beforeEach(function () {
      sinon.stub(version, "getVersion").resolves("3.0.0");
    });

    it("should call `ngrok config add-authtoken` with a string argument", async () => {
      setTimeout(function () {
        fakeChild.stdout.emit("data", "Done");
      }, 10);

      const token = "TOKEN";
      await setAuthtoken(token);
      expect(
        sinon.assert.calledOnceWithExactly(
          spawn,
          join(defaultDir, bin),
          ["config", "add-authtoken", token],
          {
            windowsHide: true,
          }
        )
      );
    });

    it("should call `ngrok config add-authtoken` with an object argument", async () => {
      setTimeout(function () {
        fakeChild.stdout.emit("data", "Done");
      }, 10);

      const tokenOpts = {
        authtoken: "TOKEN",
        configPath: "/Users/username/ngrokconfig.yml",
      };
      await setAuthtoken(tokenOpts);
      expect(
        sinon.assert.calledOnceWithExactly(
          spawn,
          join(defaultDir, bin),
          [
            "config",
            "add-authtoken",
            tokenOpts.authtoken,
            `--config=${tokenOpts.configPath}`,
          ],
          {
            windowsHide: true,
          }
        )
      );
    });
  });
});
