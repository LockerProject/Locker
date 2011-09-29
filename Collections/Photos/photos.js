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

app.get('/state', function(req, res) {
    dataStore.getTotalCount(function(err, countInfo) {
        if(err) return res.send(err, 500);
        var updated = new Date().getTime();
        try {
            var js = JSON.parse(fs.readFileSync('state.json'));
            if(js && js.updated) updated = js.updated;
        } catch(E) {}
        res.send({ready:1, count:countInfo, updated:updated});
    });
});


app.get('/allPhotos', function(req, res) {
    dataStore.getAll(function(err, cursor) {
        if(req.query["limit"]) cursor.limit(parseInt(req.query["limit"]));
        if(req.query["skip"]) cursor.skip(parseInt(req.query["skip"]));
        cursor.toArray(function(err, items) {
            res.send(items);
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

app.get('/ready', function(req, res) {
    dataStore.getTotalCount(function(err, resp) {
        if (err) {
            res.writeHead(500);
            return res.end(err);
        }
        res.writeHead(200);
        if (resp === 0) {
            return res.end('false');
        } else {
            return res.end('true');
        }
    });
});


app.get('/update', function(req, res) {
    sync.gatherPhotos(function(){
        res.send('Updating');
    });
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
    if (!lockerInfo || !lockerInfo['workingDirectory']) {
        process.stderr.write('Was not passed valid startup information.'+data+'\n');
        process.exit(1);
    }
    process.chdir(lockerInfo.workingDirectory);

    locker.connectToMongo(function(mongo) {
        logger.debug("connected to mongo " + mongo);
        sync.init(lockerInfo.lockerUrl, mongo.collections.photos, mongo);
        app.listen(lockerInfo.port, 'localhost', function() {
            process.stdout.write(data);
        });
    });
});


