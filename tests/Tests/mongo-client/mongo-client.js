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

app.get('/names', function(req, res) {
    res.writeHead(200, {'content-type':'application/json'});
    res.end(JSON.stringify(Object.keys(collections)));
});

app.get('/put', function(req, res) {
    collections.thing1.save({hello:'world'}, function(err, docs) {
        if(err) {
            res.writeHead(500);
            res.end(JSON.stringify(err));
            return;
        }
        res.writeHead(200);
        res.end('1');
    });
});

app.get('/get', function(req, res) {
    collections.thing1.findOne({hello:'world'}, function(err, doc) {
        if(err) {
            res.writeHead(500);
            res.end(JSON.stringify(err));
        } else if(doc) {
            res.writeHead(200);
            res.end(JSON.stringify(doc));
        } else {
            res.writeHead(500);
            res.end(JSON.stringify({error:'not found'}));
        }
    });
});

process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    locker.connectToMongo(function(thecollections) {
        collections = thecollections;
        app.listen(processInfo.port, function() {
            process.stdout.write(JSON.stringify({port: processInfo.port}));
        });
    });
});
process.stdin.resume();