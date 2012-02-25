var forever = require('forever');

process.env["NODE_PATH"] = __dirname + "/Common/node";

var child = new (forever.Monitor)('_lockerd.js', {
    spinSleepTime: 30000,
    minUptime: 10000,
    options: []
});

child.start();

process.on('SIGINT', function() { stop(); });
process.on('SIGTERM', function() { stop(); });

var stop = function() {
    if (child.child.pid) {
        var event = child.stop();
        event.on('stopAll', function() {
            process.exit();
        });
    } else {
        process.exit(0);
    }
}
