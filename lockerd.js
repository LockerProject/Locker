var forever = require('forever');

var child = new (forever.Monitor)('_lockerd.js', {
    spinSleepTime: 30000,
    minUptime: 10000,
    options: []
});

child.start();

process.on('SIGINT', function() { child.stop(); process.exit(); });
process.on('SIGTERM', function() { child.stop(); process.exit(); });
