/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// merge contacts from connectors
require.paths.push(__dirname + "/../../Common/node");
var lconfig = require('lconfig');
lconfig.load('../../Config/config.json');

var fs = require('fs'),
    locker = require('locker.js');
    
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
        res.write('<html><p>Found '+ countInfo +' contacts</p><a href="update">refresh from connectors</a></html>');
        res.end();
    });
});

app.get('/allMinimal', function(req, res) {
    var offset = req.param('offset') ? req.param('offset') : 0;
    var limit = req.param('limit') ? req.param('limit') : 250;
    dataStore.getMinimal(offset, limit, function(err, cursor) {
        cursor.toArray(function(err, items) {
            res.end(JSON.stringify(items));
        });
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
    sync.gatherContacts(function(){
        res.writeHead(200);
        res.end('Updating');        
    });
});

app.post('/events', function(req, res) {
    if (!req.body.obj.type || !req.body.via) {
        console.log('5 HUNDO');
        res.writeHead(500);
        res.end('bad data');
        return;
    }
    
    dataStore.addEvent(req.body, function(err, eventObj) {
        if (err) {
            res.writeHead(500);
            res.end(err);
        } else {
            if (eventObj) {
                
                locker.event("contact/full", eventObj);
            }
            res.writeHead(200);
            res.end('processed event');
        }
    });
});

app.get('/:id', function(req, res, next) {
    if (req.param('id').length != 24) return next(req, res, next);
    dataStore.get(req.param('id'), function(err, doc) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(doc));
    })
});

// Process the startup JSON object
process.stdin.resume();
process.stdin.on('data', function(data) {
    lockerInfo = JSON.parse(data);
    locker.initClient(lockerInfo);
    if (!lockerInfo || !lockerInfo.workingDirectory) {
        process.stderr.write('Was not passed valid startup information.'+data+'\n');
        process.exit(1);
    }
    process.chdir(lockerInfo.workingDirectory);
    
    locker.connectToMongo(function(mongo) {
        sync.init(lockerInfo.lockerUrl, mongo.collections.contacts, mongo);
        app.listen(lockerInfo.port, 'localhost', function() {
            process.stdout.write(data);
            sync.eventEmitter.on('contact/full', function(eventObj) {
                locker.event('contact/full', eventObj);     
            });
            // gatherContacts();
        });
    });
});


