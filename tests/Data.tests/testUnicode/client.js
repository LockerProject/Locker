//test unicode compatibility
var http = require("http");
var fs = require("fs");
var querystring = require("querystring");
    express = require('express'),
    connect = require('connect'),
    sys = require('sys'),
    app = express.createServer(
                    connect.bodyParser(),
                    connect.cookieParser(),
                    connect.session({secret : "locker"}));

app.get('/test', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });

    res.end('{"data":"♈♉♌♟♖Дворцовλευταῖόपशुपतिरपि तान्यहा學而時اибашен"}');
});

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    process.chdir(processInfo.workingDirectory);
    app.listen(processInfo.port, function() {
        var returnedInfo = {port: processInfo.port};
        console.log(JSON.stringify(returnedInfo));
    });
});

process.on("SIGINT", function() {
    console.log("ending testUnicode");
    process.exit(0);
});
