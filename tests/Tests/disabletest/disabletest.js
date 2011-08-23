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
var collections;

app.get('/', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write("ACTIVE");
    res.end();
});

var fullData = "";
process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
    fullData += chunk;
    if (fullData.indexOf("\n") > 0) {
        var processInfo = JSON.parse(chunk);
        locker.initClient(processInfo);
        process.chdir(processInfo.workingDirectory);
        locker.connectToMongo(function(mongo) {
            collections = mongo.collections;
            app.listen(0, function() {
                process.stdout.write(JSON.stringify({port: app.address().port}));
            });
        });
    }
});
process.stdin.resume();
