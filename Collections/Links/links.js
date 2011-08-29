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
        res.write('<html><p>Found '+ countInfo +' links</p></html>');
        res.end();
    });
});

app.get('/state', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'application/json'
    });
    dataStore.getTotalCount(function(err, countInfo) {
        res.write('{"updated":'+new Date().getTime()+',"ready":1,"count":'+ countInfo +'}');
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
    if (!req.body.obj.type || !req.body.via || !(req.body.via.indexOf('facebook') === 0 || req.body.via.indexOf('twitter') === 0)) {
        console.log('5 HUNDO');
        res.writeHead(500);
        res.end('bad data');
        return;
    }
    
    dataStore.addEvent(req.body, function(err, doc) {
        // what event should this be?
        // also, should the source be what initiated the change, or just contacts?  putting contacts for now.
        //
        // var eventObj = {source: req.body.obj.via, type:req.body.obj.type, data:doc};
        var eventObj = {source: "links", type:req.body.obj.type, data:doc};
        locker.event("link/full", eventObj);
        res.writeHead(200);
        res.end('new object added');
    })
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
    
    locker.connectToMongo(function(mongo) {
        sync.init(lockerInfo.lockerUrl, mongo.collections.links);
        app.listen(lockerInfo.port, 'localhost', function() {
            process.stdout.write(data);
            sync.eventEmitter.on('link/full', function(eventObj) {
                locker.event('link/full', eventObj);
            });
            // gatherContacts();
        });
    });
});
