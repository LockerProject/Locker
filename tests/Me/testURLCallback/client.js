var http = require("http");
var fs = require("fs");

// Startup shiz
process.stdin.resume();
process.stdin.on("data", function(data) {
    var info = JSON.parse(data);
    server = http.createServer(function(req, res) {
        var fd = fs.openSync("result.json", "w");
        fs.writeSync(fd, '{"result":true}');
        fs.close(fd);
        res.end("Done");
        process.exit(0);
    }).listen(info.port, "127.0.0.1", function() {
        process.stdout.write(data);
    });
});

setTimeout(function() {
    process.exit(1);
}, 2000);
