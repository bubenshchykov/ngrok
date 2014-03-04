console.error("ngrok - Downloading newest binary...");

var os = require('os');
var https = require('https');
var fs = require('fs');
var util = require('util');
var unzip = require('unzip');

var files = {
	darwinia32: 'https://dl.ngrok.com/darwin_amd64/ngrok.zip',
	darwinx64: 'https://dl.ngrok.com/darwin_amd64/ngrok.zip',
	linuxarm: 'https://dl.ngrok.com/linux_arm/ngrok.zip',
	linuxia32: 'https://dl.ngrok.com/linux_386/ngrok.zip',
	linuxx64: 'https://dl.ngrok.com/linux_386/ngrok.zip',
	win32ia32: 'https://dl.ngrok.com/windows_386/ngrok.zip',
	win32x64: 'https://dl.ngrok.com/windows_386/ngrok.zip'
}

var path = __dirname + "/bin/";
if (!fs.existsSync(path)) {
	fs.mkdirSync(path);
}

var zip = fs.createWriteStream(path + "ngrok.zip");
var which = os.platform() + os.arch();

var request = https.get(files[which], function(response) {
	response.pipe(zip, {end:false});
	response.on('end', function() {
		console.error("ngrok - Zipfile received (" + files[which] + ") ...");
		unzipFile(path + "ngrok.zip");
	});
});

var unzipFile = function(file) {
	var suffix = (os.platform() === "win32") ? ".exe" : "";
	var binary = fs.createReadStream(file);
	binary.pipe(unzip.Extract({ path: path }).on('close', function() {
		fs.rename(path + "ngrok" + suffix, path + "ngrok-" + os.platform() + suffix, function (err) {
			var target = path + "ngrok-" + os.platform() + suffix;
			fs.chmodSync(target, 755);
			if (err) {
				console.log("ngrok - Could not rename file.");
				process.exit(-1);
			}
			if (fs.existsSync(target) && fs.statSync(target).size > 0) {
					console.error("ngrok - Binary downloaded.");
					process.exit(0);
			}
			console.error("ngrok - Binary NOT downloaded.");
			process.exit(-1);
		});
	}));
};