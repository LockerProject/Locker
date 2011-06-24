/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var express = require('express');
var app = express.createServer();
var locker = require('../locker.js');

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    lockerBase = processInfo.lockerUrl;
    locker.initClient(processInfo);
    process.chdir(processInfo.sourceDirectory);
    app.set('views', processInfo.sourceDirectory);
    app.configure(function() {
        app.use(express.static(processInfo.sourceDirectory + '/static'));
    });
    app.get('/', function(req, res) {
        res.render('static/index.html');
    })
    app.listen(processInfo.port,function() {
        var returnedInfo = {};
        console.log(JSON.stringify(returnedInfo));
    });
});
