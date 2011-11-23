/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// merge places from connectors

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

app.get('/state', function(req, res) {
    dataStore.getTotalCount(function(err, countInfo) {
        if(err) return res.send(err, 500);
        dataStore.getLastObjectID(function(err, lastObject) {
            if(err) return res.send(err, 500);
            var objId = "000000000000000000000000";
            if (lastObject) objId = lastObject._id.toHexString();
            var updated = new Date().getTime();
            try {
                var js = JSON.parse(fs.readFileSync('state.json'));
                if(js && js.updated) updated = js.updated;
            } catch(E) {}
            res.send({ready:1, count:countInfo, updated:updated, lastId:objId});
        });
    });
});


app.get('/', function(req, res) {
    var fields = {};
    if (req.query.fields) {
        try {
            fields = JSON.parse(req.query.fields);
        } catch(E) {}
    }
    dataStore.getAll(fields, function(err, cursor) {
        if(!req.query["all"]) cursor.limit(20); // default 20 unless all is set
        if(req.query["limit"]) cursor.limit(parseInt(req.query["limit"]));
        if(req.query["offset"]) cursor.skip(parseInt(req.query["offset"]));
        if(req.query["sort"]) {
            var sorter = {}
            if(req.query["order"]) {
                sorter[req.query["sort"]] = +req.query["order"];
            } else {
                sorter[req.query["sort"]] = 1;
            }
            cursor.sort(sorter);
        }
        cursor.toArray(function(err, items) {
            res.send(items);
        });
    });
});

app.get("/since", function(req, res) {
    if (!req.query.id) {
        return res.send([]);
    }

    var results = [];
    dataStore.getSince(req.query.id, function(item) {
        results.push(item);
    }, function() {
        res.send(results);
    });
});

app.get('/update', function(req, res) {
    sync.gatherPlaces(req.query.type, function(){
        res.send('Making cookies for temas!');
    });
});

app.post('/events', function(req, res) {
    if (!req.body.type || !req.body.obj) {
        logger.error("Invalid event.");
        res.writeHead(500);
        res.end("Invalid Event");
        return;
    }

    dataStore.addEvent(req.body, function(err, eventObj) {
        if (err) {
            logger.error("Error processing: " + err);
            res.writeHead(500);
            res.end(err);
            return;
        }

        res.writeHead(200);
        res.end("Event Handled");
    });
});

app.get('/id/:id', function(req, res, next) {
    if (req.param('id').length != 24) return next(req, res, next);
    dataStore.get(req.param('id'), function(err, doc) {
        res.send(doc);
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
        sync.init(lockerInfo.lockerUrl, mongo.collections.place, mongo, locker);
        app.listen(0, function() {
            var returnedInfo = {port: app.address().port};
            process.stdout.write(JSON.stringify(returnedInfo));
        });
    });
});