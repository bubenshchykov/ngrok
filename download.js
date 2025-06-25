/*
- downloads archived binary from ngrok cdn (if not found in local cache)
- stores it in home dir as a local cache
- extracts executable to module's bin folder
*/

function downloadNgrok(callback, options) {
  options = options || {};

  const os = require("os");
  const fs = require("fs");
  const path = require("path");
  const readline = require("readline");
  const extract_zip = require("extract-zip");
  const got = require("got").default;

  const cafilePath = options.cafilePath || process.env.NGROK_ROOT_CA_PATH;
  const cdnUrl = getCdnUrl();
  const cacheUrl = getCacheUrl();
  const maxAttempts = 3;
  let attempts = 0;

  if (hasCache()) {
    console.error("ngrok - cached download found at " + cacheUrl);
    extract(retry);
  } else {
    download(retry);
  }

  function getCdnUrl() {
    const arch =
      options.arch || process.env.NGROK_ARCH || os.platform() + os.arch();
    const cdn =
      options.cdnUrl || process.env.NGROK_CDN_URL || "https://bin.equinox.io";
    const cdnPath =
      options.cdnPath ||
      process.env.NGROK_CDN_PATH ||
      "/c/bNyj1mQVY4c/ngrok-v3-stable-";
    const cdnFiles = {
      darwinia32: cdn + cdnPath + "darwin-386.zip",
      darwinx64: cdn + cdnPath + "darwin-amd64.zip",
      darwinarm64: cdn + cdnPath + "darwin-arm64.zip",
      linuxarm: cdn + cdnPath + "linux-arm.zip",
      linuxarm64: cdn + cdnPath + "linux-arm64.zip",
      androidarm: cdn + cdnPath + "linux-arm.zip",
      androidarm64: cdn + cdnPath + "linux-arm64.zip",
      linuxia32: cdn + cdnPath + "linux-386.zip",
      linuxx64: cdn + cdnPath + "linux-amd64.zip",
      win32ia32: cdn + cdnPath + "windows-386.zip",
      win32x64: cdn + cdnPath + "windows-amd64.zip",
      freebsdia32: cdn + cdnPath + "freebsd-386.zip",
      freebsdx64: cdn + cdnPath + "freebsd-amd64.zip",
    };
    const url = cdnFiles[arch];
    if (!url) {
      console.error("ngrok - platform " + arch + " is not supported.");
      process.exit(1);
    }
    return url;
  }

  function getCacheUrl() {
    let dir;

    if (options.cacheDir) dir = options.cacheDir;
    else {
      try {
        dir =
          os.platform() === "win32" && process.env.APPDATA
            ? path.join(process.env.APPDATA, "ngrok")
            : path.join(os.homedir(), ".ngrok");
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
          fs.mkdirSync(dir);
        }
      } catch (err) {
        dir = path.join(__dirname, "bin");
      }
    }
    const name = Buffer.from(cdnUrl).toString("base64");
    return path.join(dir, name + ".zip");
  }

  function hasCache() {
    if (options.ignoreCache || process.env.NGROK_IGNORE_CACHE === "true") {
      return false;
    }
    return fs.existsSync(cacheUrl) && fs.statSync(cacheUrl).size;
  }

  function download(cb) {
    console.error("ngrok - downloading binary " + cdnUrl);

    const certificateAuthority = tryToReadCaFile();

    const gotOptions = { https: { certificateAuthority } };

    if (process.env.HTTPS_PROXY) {
      try {
        const { HttpsProxyAgent } = require("hpagent");
        gotOptions.agent = {
          https: new HttpsProxyAgent({ proxy: process.env.HTTPS_PROXY }),
        };
      } catch (error) {
        throw new Error(
          "You have the HTTPS_PROXY environment variable set, but you are missing the optional dependency hpagent. Please install hpagent as a dependency and try again."
        );
      }
    }

    const downloadStream = got.stream(cdnUrl, gotOptions);
    process.stderr.write("ngrok - downloading progress: ");
    downloadStream
      .on("response", (res) => {
        if (!/2\d\d/.test(res.statusCode)) {
          res.pause();
          return downloadStream.emit(
            "error",
            new Error("wrong status code: " + res.statusCode)
          );
        }
      })
      .on("downloadProgress", ({ percent, transferred, total }) => {
        readline.clearLine(process.stderr, 0, () => {
          readline.cursorTo(process.stderr, 0, null, () => {
            process.stderr.write(
              `ngrok - downloading progress: ${transferred}/${total} (${(
                percent * 100
              ).toFixed(2)}%)`
            );
          });
        });
      })
      .on("error", (error) => {
        console.error("\nngrok - error downloading from URL", error);
        cb(error);
      });

    const outputStream = fs
      .createWriteStream(cacheUrl)
      .on("error", (e) => {
        console.error("ngrok - error storing binary to local file", e);
        cb(e);
      })
      .on("finish", () => {
        console.error("\nngrok - binary downloaded to " + cacheUrl);
        extract(cb);
      });

    downloadStream.pipe(outputStream);
  }

  function extract(cb) {
    console.error("ngrok - unpacking binary");
    const moduleBinPath = options.binDir || path.join(__dirname, "bin");
    extract_zip(cacheUrl, { dir: moduleBinPath })
      .then(() => {
        const suffix = os.platform() === "win32" ? ".exe" : "";
        if (suffix === ".exe") {
          fs.writeFileSync(path.join(moduleBinPath, "ngrok.cmd"), "ngrok.exe");
        }
        const target = path.join(moduleBinPath, "ngrok" + suffix);
        fs.chmodSync(target, 0o755);
        if (!fs.existsSync(target) || fs.statSync(target).size <= 0) {
          return cb(new Error("corrupted file " + target));
        }
        console.log("ngrok - binary unpacked to " + target);
        cb(null);
      })
      .catch((e) => {
        console.error("ngrok - error unpacking binary", e);
        cb(e);
      });
  }

  function retry(err) {
    attempts++;
    if (err && attempts === maxAttempts) {
      console.error("ngrok - install failed", err);
      return callback(err);
    }
    if (err) {
      console.warn("ngrok - install failed, retrying");
      return setTimeout(download, 500, retry);
    }
    callback();
  }

  function tryToReadCaFile() {
    try {
      const caString =
        fs.existsSync(cafilePath) && fs.readFileSync(cafilePath).toString();

      const caContents =
        caString &&
        caString
          .split("-----END CERTIFICATE-----")
          .filter((c) => c.trim().startsWith("-----BEGIN CERTIFICATE-----"))
          .map((c) => `${c}-----END CERTIFICATE-----`);

      return caContents.length > 0 ? caContents : undefined;
    } catch (error) {
      console.warn(error);
      return undefined;
    }
  }
}

module.exports = downloadNgrok;
