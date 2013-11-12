var spawn = require("child_process").spawn;
var path = require('path');

var ngrokPath = path.join(__dirname, 'bin/ngrok.exe');
var ngrok = spawn(ngrokPath, [
    '-authtoken',
    '9qh-WUj4noglhhjqe_-Q',
    '-subdomain=debitoor23',
    '-log=stdout',
    8080
]);

ngrok.stdout.on('data', function (data) {
    console.log(data.toString());
});

ngrok.stderr.on('data', function (data) {
    console.log(data.toString());
});

ngrok.on('close', function (code) {
    console.log('process exit code ' + code);
});