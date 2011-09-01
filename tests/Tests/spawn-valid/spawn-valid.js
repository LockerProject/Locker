/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var app = require('express').createServer();

app.get('/', function(req, res) {
    res.writeHead(200, {'content-type':'text/plain'});
    res.end('42');
});

process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    process.chdir(processInfo.workingDirectory);
    app.listen(0, function() {
        process.stdout.write(JSON.stringify({port: app.address().port}));
    });
});
process.stdin.resume();
