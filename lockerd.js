var forever = require('forever');

var child = new (forever.Monitor)('_lockerd.js', {
    spinSleepTime: 30000,
    minUptime: 10000,
    options: []
});

child.start();

process.on('SIGINT', function() { stop(); });
process.on('SIGTERM', function() { stop(); });

var stop = function() {
    var event = child.stop();
    event.on('stopAll', function() {
        process.exit();
    });
}
