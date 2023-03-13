const { defaultConfigPath, oldDefaultConfigPath } = require("../src/utils");
const fs = require("fs");

function removeAuthtoken() {
  try {
    fs.unlinkSync(defaultConfigPath());
  } catch (error) {}
  try {
    fs.unlinkSync(oldDefaultConfigPath());
  } catch (error) {}
}

// function create

module.exports = {
  removeAuthtoken: removeAuthtoken,
};
