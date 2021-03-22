const homedir = require("homedir");
const path = require("path");
const fs = require("fs");

function removeAuthtoken() {
  try {
    fs.unlinkSync(path.join(homedir(), "/.ngrok2/ngrok.yml"));
  } catch (ex) {}
}

module.exports = {
  removeAuthtoken: removeAuthtoken,
};
