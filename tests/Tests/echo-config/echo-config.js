/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var app = require('express').createServer();
var processInfo;

app.get('/', function(req, res) {
    res.writeHead(200, {'content-type':'application/json'});
    res.end(JSON.stringify(processInfo));
});

process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
    processInfo = JSON.parse(chunk);
    process.chdir(processInfo.workingDirectory);
    app.listen(23456, function() {
        process.stdout.write(JSON.stringify({port: 23456}));
    });
});
process.stdin.resume();