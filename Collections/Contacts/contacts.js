/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// merge contacts from connectors

var locker = require('locker.js');
var express = require('express');
var connect = require('connect');
var url = require('url');
var sync = require('./sync');
var dataStore = require('./dataStore');

var app = express.createServer(connect.bodyParser());

var updating = false;
app.get('/update', function(req, res) {
    if (updating) { return res.send("Already updating..."); }
    updating = true;
    sync.gatherContacts(function() {
        updating = false;
    });
    res.send("Update started");
});

app.post('/events', function(req, res) {
    if (!req.body.idr || !req.body.data) return res.send('bad data', 500);
    // we don't support these yet
    if(req.body.action == 'delete') return res.send('skipping');
    var idr = url.parse(req.body.idr);
    dataStore.addData(idr.host, req.body.data, function(err, eventObj) {
        if (err) res.send(err, 500);
        else res.send('processed event');
    });
});

// Process the startup JSON object
process.stdin.resume();
process.stdin.on('data', function(data) {
    var lockerInfo = JSON.parse(data);
    locker.initClient(lockerInfo);
    if (!lockerInfo || !lockerInfo.workingDirectory) {
        process.stderr.write('Was not passed valid startup information.'+data+'\n');
        process.exit(1);
    }
    process.chdir(lockerInfo.workingDirectory);

    var lconfig = require('lconfig');
    lconfig.load('../../Config/config.json');
    locker.connectToMongo(function(mongo) {
        sync.init(lockerInfo.lockerUrl, mongo, locker, lconfig);
        app.listen(0, function() {
            var returnedInfo = {port: app.address().port};
            process.stdout.write(JSON.stringify(returnedInfo));
        });
    });
});


