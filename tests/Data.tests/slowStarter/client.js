var http = require("http");
var fs = require("fs");
var querystring = require("querystring");

// Startup shiz
process.stdin.resume();
process.stdin.on("data", function(data) {
    // Does normal stuff after a second pause to be a slow starter
    setTimeout(function() {
        var info = JSON.parse(data);
        server = http.createServer(function(req, res) {
            process.stdout.write("Sending: " + '{"url":"'+req.url+'","method":"'+req.method+'"}');
            if (req.url == "/firstPass") {
                res.writeHead(200);
                res.end();
                setTimeout(function() {
                    process.exit(0);
                }, 100);
            }
            res.writeHead(200, {"Content-Type":"application/json"});
            res.end('{"url":"'+req.url+'","method":"'+req.method+'"}');
        }).listen(info.port, "127.0.0.1", function() {
            process.stdout.write(data);
        });
    }, 1000);
});
