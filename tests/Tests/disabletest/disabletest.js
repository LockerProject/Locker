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

app.get('/', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write("ACTIVE");
    res.end();
});

process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    app.listen(0, function() {
        process.stdout.write(JSON.stringify({port: app.address().port}));
    });
});
process.stdin.resume();