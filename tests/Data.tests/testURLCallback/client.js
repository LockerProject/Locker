var http = require("http");
var fs = require("fs");
var querystring = require("querystring");
var util = require("util");

// Startup shiz
process.stdin.resume();
process.stdin.on("data", function(data) {
    var info = JSON.parse(data);
    server = http.createServer(function(req, res) {
        if (req.url == "/write") {
            var fd = fs.openSync("result.json", "w");
            fs.writeSync(fd, '{"result":true}');
            fs.close(fd);
            res.end("");
            return;
        } else if (req.url == "/event") {
            var body = "";
            req.on("data", function(chunk) {
                body += chunk;
            });
            req.on("end", function() {
                fs.writeFileSync('event.json', body);
                res.end("");
            });
            return;
        } else if (req.url == "/end"){
            res.writeHead(200);
            res.end();
            process.exit(0);
        }
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end('{"url":"'+req.url+'","method":"'+req.method+'"}');
    }).listen(0, "127.0.0.1", function() {
        var address = this.address();
        info.port = address.port;
        data = JSON.stringify(info);
        process.stdout.write(data);
    });
});

process.on("SIGINT", function() {
    process.exit(0);
});
