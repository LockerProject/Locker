var http = require("http");
var fs = require("fs");
var sys = require('sys');
var connect = require('connect'),
    express = require('express'),
    app = express.createServer(
            connect.bodyParser(),
            connect.cookieParser(),
            connect.session({secret : "locker"}));

// Startup shiz
process.stdin.resume();
process.stdin.on("data", function(chunk) {
    sys.debug('flickr-connector-event-test!!!');
    
    var processInfo = JSON.parse(chunk);
    process.chdir(processInfo.workingDirectory);
    var eventCount = 1;
    app.post('/event', function(req, res) {
 //       sys.debug('flickr-event!!!');
        fs.writeFileSync('events', "" + eventCount);
        eventCount++;
//        sys.debug("events:" + fs.readFileSync('events'));
        res.writeHead(200);
        res.end();
    });
    app.listen(processInfo.port);
    var returnedInfo = {port: processInfo.port};
    console.log(JSON.stringify(returnedInfo));
});
