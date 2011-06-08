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
    
var app = express.createServer();
app.use(express.static(__dirname + '/static'));


// Process the startup JSON object
process.stdin.resume();
process.stdin.on("data", function(data) {
    var lockerInfo = JSON.parse(data);
    process.chdir(lockerInfo.workingDirectory);
    app.listen(lockerInfo.port, "localhost", function() {
        process.stdout.write(data);
    });
});