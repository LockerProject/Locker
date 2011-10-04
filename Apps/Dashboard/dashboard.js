/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var lconfig = require('../../Common/node/lconfig.js');
lconfig.load('Config/config.json');


var express = require('express');
var connect = require('connect');

var app = express.createServer(connect.bodyParser(), connect.cookieParser());

// Woo woo startup stuff!
var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    process.chdir(processInfo.workingDirectory);
    require('./dashboard-client')(lconfig.lockerHost, lconfig.lockerPort, processInfo.port, lconfig.externalBase);
    process.stdout.write(JSON.stringify({port: processInfo.port}));
});
stdin.resume();

