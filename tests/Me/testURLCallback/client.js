var http = require("http");
var fs = require("fs");

// Startup shiz
process.stdin.resume();
process.stdin.on("data", function(data) {
    var info = JSON.parse(data);
    server = http.createServer(function(req, res) {
        process.stdout.write("Sending: " + '{"url":"'+req.url+'","method":"'+req.method+'"}');
        if (req.url == "/write") {
            var fd = fs.openSync("result.json", "w");
            fs.writeSync(fd, '{"result":true}');
            fs.close(fd);
            res.end("");
            return;
        }
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end('{"url":"'+req.url+'","method":"'+req.method+'"}');
    }).listen(info.port, "127.0.0.1", function() {
        process.stdout.write(data);
    });
});
