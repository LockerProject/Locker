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

var events = {};
app.post('/event', function(req, res) {
    res.writeHead(200);
    res.end();
    if(req.body.obj.source) {
        if (!events[req.body.obj.source]) {
            events[req.body.obj.source] = [];
        }
        events[req.body.obj.source].push(req.body);
    } else {
        console.error(req.body);
    }
});

app.get('/getEvents/:type', function(req, res) {
    var type = unescape(req.params.type);
    if(!events[type]) {
        res.writeHead(500);
        res.end(JSON.stringify(0));
    } else {
        res.writeHead(200);
        console.error('getting ' + events[type].length + ' for type', type);
        res.end(JSON.stringify(events[type].length));
    }
});

app.get('/listen/:type', function(req, res) {
    var type = unescape(req.params.type);
    locker.listen(type, '/event', function(err) {
        res.writeHead(200);
        res.end('Listening to ' + type);
    });
})

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