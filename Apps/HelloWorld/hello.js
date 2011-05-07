/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/


var fs = require('fs'),http = require('http');
var express = require('express'),connect = require('connect');
var app = express.createServer(connect.bodyParser(), connect.cookieParser(), connect.session({secret : "locker"}));

app.set('views', __dirname);

app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    res.end("yeah, hello world, and stuff");
});

app.get('/foo',
function(req, res) {
    res.redirect('/bar');
});

app.get('/bar',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    res.end("coffee or beer?");
});

app.get('/utf8',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    
    res.end('{"data":"♈♉♌♟♖Дворцовλευταῖόपशुपतिरपि तान्यहा學而時اибашен"}');
});

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    process.chdir(processInfo.workingDirectory);
    app.listen(processInfo.port);
    var returnedInfo = {};
    console.log(JSON.stringify(returnedInfo));
});
