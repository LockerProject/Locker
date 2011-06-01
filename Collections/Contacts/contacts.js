/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// merge contacts from journals
var fs = require('fs'),
    sys = require('sys'),
    http = require('http'),
    url = require('url'),
    lfs = require('../../Common/node/lfs.js'),
    locker = require('../../Common/node/locker.js'),
    lconfig = require('../../Common/node/lconfig.js'),
    request = require('request'),
    crypto = require('crypto');
    
var sync = require('./sync');
var dataStore = require("./dataStore");

var lockerInfo;
var express = require('express'),
    connect = require('connect');
var app = express.createServer(connect.bodyParser());

app.set('views', __dirname);

app.get('/', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    dataStore.getTotalCount(function(err, countInfo) {
        res.write('<html><p>Tracking '+ countInfo +' contacts</p><p><a href="update">Update from Connectors</a></p></html>');
        res.end();
    });
});

app.get('/allContacts', function(req, res) {
    res.writeHead(200, {
        'Content-Type':'application/json'
    });
    dataStore.getAll(function(err, cursor) {
        cursor.toArray(function(err, items) {
            res.end(JSON.stringify(items));
        });
    });
});

app.get('/update', function(req, res) {
    sync.gatherContacts();
    res.writeHead(200);
    res.end('Updating');
});

app.post('/foursquareListener', function(req, res) {
    if (!req.body.obj.type) {
        console.log('5 HUNDO');
        res.writeHead(500);
        res.end('bad data');
        return;
    }
    switch (req.body.obj.type) {
        // what do we want to do for a delete event?
        //
        case 'delete':
            break;
        default:
            dataStore.addFoursquareData(req.body.obj, function(err, doc) {
                res.writeHead(200);
                res.end('new object added');
                // what event should this be?
                // also, should the source be what initiated the change, or just contacts?  putting contacts for now.
                //
                // var eventObj = {source: req.body.obj._via, type:req.body.obj.type, data:doc};
                var eventObj = {source: "contacts", type:req.body.obj.type, data:doc};
                locker.event("contact/full", eventObj);
            });
            break;
    }
});

// Process the startup JSON object
process.stdin.resume();
process.stdin.on('data', function(data) {
    lockerInfo = JSON.parse(data);
    locker.initClient(lockerInfo);
    if (!lockerInfo || !lockerInfo['workingDirectory']) {
        process.stderr.write('Was not passed valid startup information.'+data+'\n');
        process.exit(1);
    }
    process.chdir(lockerInfo.workingDirectory);
    
    locker.connectToMongo(function(thecollections) {
        sync.init(lockerInfo.lockerUrl, thecollections.contacts);
        app.listen(lockerInfo.port, 'localhost', function() {
            sys.debug(data);
            process.stdout.write(data);
            locker.listen('contact/foursquare', '/foursquareListener');
            sync.eventEmitter.on('contact/full', function(eventObj) {
                locker.event('contact/full', eventObj);
            });
            // gatherContacts();
        });
    });
});


