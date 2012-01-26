/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var express = require('express'),
    connect = require('connect');
var twss = require('twss');
var request = require('request');
    
var app = express.createServer();
app.get('/event', function(req, res) {
res.send(true);
if(!req || !req.body || !req.body.data || !req.body.data.text) return;
if(!twss.is(req.body.data.text)) return;
// dm to self plus quote
request.post(...);
})


// Process the startup JSON object
process.stdin.resume();
process.stdin.on("data", function(data) {
    var lockerInfo = JSON.parse(data);
    process.chdir(lockerInfo.workingDirectory);
    app.listen(lockerInfo.port, "localhost", function() {
        process.stdout.write(data);
    });
});
