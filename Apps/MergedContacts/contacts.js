/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var express = require('express');
var connect = require('connect');
var request = require('request');
    
var app = express.createServer();
var collUrl;

app.get('/ready', function(req, res) {
    res.writeHead(200);
    request.get({url:collUrl}, function(err, resp, body) {
        if(JSON.parse(body).count > 0) {
            res.end('true');
            return;
        }
        res.end('false');
    });
});

app.use(express.static(__dirname + '/static'));


// Process the startup JSON object
process.stdin.resume();
process.stdin.on("data", function(data) {
    var lockerInfo = JSON.parse(data);
    collUrl = lockerInfo.lockerUrl + '/Me/contacts/state';
    process.chdir(lockerInfo.workingDirectory);
    app.listen(lockerInfo.port, "localhost", function() {
        process.stdout.write(data);
    });
});