const os = require("os");
const path = require("path");
const fs = require("fs");
const pkgName = require("./package.json").name;

require("./download")((err) => {
  // Fix default executable path on Windows Git Bash
  if (!err && process.env.MSYSTEM && os.release().includes("10")) {
    const exeFile = path.resolve(
      process.env.APPDATA,
      path.join("npm", pkgName)
    );

    if (fs.existsSync(exeFile)) {
      const parsedContent = fs
        .readFileSync(exeFile)
        .toString()
        .replace(
          `"$basedir/node_modules/${pkgName}/bin/${pkgName}"`,
          `"winpty" "$basedir/node_modules/${pkgName}/bin/${pkgName}.exe"`
        );

      fs.writeFileSync(exeFile, parsedContent);
    }
  }

  process.exit(err ? 1 : 0);
});
