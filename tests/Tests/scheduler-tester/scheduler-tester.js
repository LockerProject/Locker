/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/


var app = require('express').createServer();

var locker = require(__dirname + '/../../../Common/node/locker.js');
var scheduled = 0;

app.get('/scheduled', function(req, res) {
    scheduled++;
    res.writeHead(200);
    res.end();
});

app.get('/getScheduledCount', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write(scheduled.toString());
    res.end();
});

process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    try {
        app.listen(processInfo.port, function() {
            process.stdout.write(JSON.stringify({port: processInfo.port}));
        });
    } catch (E) {
        process.stdout.write(JSON.stringify({port: processInfo.port}));
    }
});
process.stdin.resume();