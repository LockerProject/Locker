/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// Dependencies required by our Locker App
var express = require('express'),
    connect = require('connect');

// Create a bare bones server to allow access to our static files
// where we have our index.html
var app = express.createServer();
app.use(express.static(__dirname + '/static'));

// This is required for every application by Locker. 
// Process the startup JSON object
process.stdin.resume();
process.stdin.on("data", function(data) {
    var lockerInfo = JSON.parse(data);
    process.chdir(lockerInfo.workingDirectory);
    app.listen(lockerInfo.port, "localhost", function() {
        process.stdout.write(data);
    });
});
