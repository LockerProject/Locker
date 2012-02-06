//test cookie passing
var http = require("http");
var fs = require("fs");
var querystring = require("querystring");
    express = require('express'),
    connect = require('connect'),
    app = express.createServer();


var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    process.chdir(processInfo.workingDirectory);
    app.listen(processInfo.port, function() {
        console.log(JSON.stringify({port: app.address().port}));
    });
});


app.get('/test',
function(req, res) {
    res.cookie('rememberme', 'yes', { maxAge: 900000 });
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
//    res.cookie('locker_proxy_cookie_test', 'works');
    res.end();
});
