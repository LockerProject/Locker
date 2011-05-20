/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var app = require('express').createServer(require('connect').bodyParser());
var locker = require(__dirname + '/../../../Common/node/locker.js');
var collections;

app.get('/', function(req, res) {
    res.writeHead(200);
    res.end();
});

var events = {friends:[], followers:[], mentions:[], home_timeline:[]};
app.post('/event', function(req, res) {
    res.writeHead(200);
    res.end();
    if(req.body.obj.source) {
        events[req.body.obj.source].push(req.body);
    } else {
        console.error(req.body);
    }
});

app.get('/getEvents/:type', function(req, res) {
    res.writeHead(200);
    console.error('getting ' + events[req.params.type].length + ' for type', req.params.type);
    res.end(JSON.stringify(events[req.params.type].length));
});

process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    app.listen(processInfo.port, function() {
        locker.listen('contact/twitter', '/event', function(err) {
            locker.listen('status/twitter', '/event', function(err) {
                process.stdout.write(JSON.stringify({port: processInfo.port}));
            });
        });
    });
});
process.stdin.resume();