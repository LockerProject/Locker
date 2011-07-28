/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// merge contacts from connectors

var locker = require('../../Common/node/locker.js');
    
var fs = require('fs');
var sync = require('./sync');
var dataStore = require("./dataStore");
var logger = require("../../Common/node/logger.js").logger;

var lockerInfo;
var express = require('express'),
    connect = require('connect');
var app = express.createServer(connect.bodyParser());
var request = require('request');

app.get('/', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    dataStore.getTotalCount(function(err, countInfo) {
        res.write('<html><p>Found '+ countInfo +' photos</p>(<a href="update">Update</a>)</html>');
        res.end();
    });
});

app.get('/allPhotos', function(req, res) {
    res.writeHead(200, {
        'Content-Type':'application/json'
    });
    dataStore.getAll(function(err, cursor) {
        cursor.toArray(function(err, items) {
            res.end(JSON.stringify(items));
        });
    });
});

app.get("/fullPhoto/:photoId", function(req, res) {
    if (!req.params.photoId) {
        res.writeHead(500);
        res.end("No photo id supplied");
        return;
    }
    dataStore.getOne(req.params.photoId, function(error, data) {
        if (error) {
            res.writeHead(500);
            res.end(error);
        } else {
            res.writeHead(302, {"location":data.url});
            res.end("");
            /*
            request.get({url:data.url}, function(error, resp, body) {
                if (error) {
                    res.writeHead(500);
                    res.end(error);
                } else {
                    res.writeHead(200, resp.headers);
                    res.end(body);
                }
            });
            */
        }
    })
});

app.get("/getPhoto/:photoId", function(req, res) {
    dataStore.getOne(req.params.photoId, function(error, data) {
        if (error) {
            res.writeHead(500);
            res.end(error);
        } else {
            res.writeHead(200, {"Content-Type":"application/json"});
            res.end(JSON.stringify(data));
        }
    })
});

app.get('/update', function(req, res) {
    sync.gatherPhotos();
    res.writeHead(200);
    res.end('Updating');
});

app.post('/events', function(req, res) {
    if (!req.body.type || !req.body.obj) {
        logger.debug("Invalid event.");
        res.writeHead(500);
        res.end("Invalid Event");
        return;
    }
    
    dataStore.processEvent(req.body, function(error) {
        if (error) {
            logger.debug("Error processing: " + error);
            res.writeHead(500);
            res.end(error);
            return;
        }
        
        res.writeHead(200);
        res.end("Event Handled");
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
    
    locker.connectToMongo(function(mongo) {
        logger.debug("connected to mongo " + mongo);
        sync.init(lockerInfo.lockerUrl, mongo.collections.photos);
        app.listen(lockerInfo.port, 'localhost', function() {
            process.stdout.write(data);
        });
    });
});


