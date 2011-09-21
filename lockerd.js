var forever = require('forever');

var child = new (forever.Monitor)('_lockerd.js', {
    spinSleepTime: 2000,
    minUptime: 10000,
    options: []
});

child.start();

process.on('SIGINT', function() { child.stop() });
process.on('SIGTERM', function() { child.stop() });
