/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// merge links from connectors

var fs = require('fs'),
    locker = require('../../Common/node/locker.js');
    
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
        res.write('<html><p>Found '+ countInfo +' links</p><p><a href="update">Update from Connectors</a></p></html>');
        res.end();
    });
});

app.get('/allLinks', function(req, res) {
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
    sync.gatherLinks();
    res.writeHead(200);
    res.end('Updating');
});

app.post('/events', function(req, res) {
    var target;
    var body = req.body;
    var obj = body.obj;
    var via = body._via[0];
    if (!obj.type || !via) {
        console.log('5 HUNDO');
        res.writeHead(500);
        res.end('bad data');
        return;
    }
    if(!(via.indexOf('facebook') === 0 || via.indexOf('twitter') === 0))  {
        res.writeHead(500);
        console.log('event received by the contacts collection with an invalid type');
        res.end("Don't know what to do with this event");
        return;
    }
    dataStore.addLink(via, obj.data.sourceObject, obj.data.url, function(err, doc) {
        res.writeHead(200);
        res.end('new object added');
        // what event should this be?
        // also, should the source be what initiated the change, or just contacts?  putting contacts for now.
        //
        // var eventObj = {source: req.body.obj._via, type:req.body.obj.type, data:doc};
        var eventObj = {source: "links", type:req.body.obj.type, data:doc};
        locker.event("link/full", eventObj);
    });
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
        sync.init(lockerInfo.lockerUrl, thecollections.links);
        app.listen(lockerInfo.port, 'localhost', function() {
            process.stdout.write(data);
            // locker.listen('contact/foursquare', '/events');
            locker.listen('link/facebook', '/events');
            locker.listen('link/twitter', '/events');
            sync.eventEmitter.on('link/full', function(eventObj) {
                locker.event('link/full', eventObj);
            });
            // gatherContacts();
        });
    });
});