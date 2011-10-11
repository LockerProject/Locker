/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// merge places from connectors

var fs = require('fs'),
    url = require('url'),
    request = require('request'),
    locker = require('../../Common/node/locker.js');
var async = require("async");

var dataIn = require('./dataIn'); // for processing incoming twitter/facebook/etc data types
var dataStore = require("./dataStore"); // storage/retreival of raw places
var util = require("./util"); // handy things for anyone and used within place processing

var lockerInfo;
var express = require('express'),
    connect = require('connect');
var app = express.createServer(connect.bodyParser());

app.set('views', __dirname);

app.get('/', function(req, res) {
    var options = {};
    if(!req.query["all"]) options.limit = 20; // default 20 unless all is set
    if (req.query.limit) {
        options.limit = parseInt(req.query.limit);
    }
    if (req.query.offset) {
        options.offset = parseInt(req.query.offset);
    }
    if (req.query.fields) {
        try {
            options.fields = JSON.parse(req.query.fields);
        } catch(E) {}
    }
    options.me = req.query.me;
    var results = [];
    dataStore.getPlaces(options, function(item) { results.push(item); }, function(err) { res.send(results); });
});

app.get('/state', function(req, res) {
    dataStore.getTotalPlaces(function(err, countInfo) {
        if(err) return res.send(err, 500);
        var updated = new Date().getTime();
        try {
            var js = JSON.parse(fs.readFileSync('state.json'));
            if(js && js.updated) updated = js.updated;
        } catch(E) {}
        res.send({ready:1, count:countInfo, updated:updated});
    });
});


app.get('/update', function(req, res) {
    dataIn.reIndex(locker,function(){
        res.writeHead(200);
        res.end('Making cookies for temas!');
    });
});

app.post('/events', function(req, res) {
    if (!req.body.type || !req.body.obj){
        console.log('5 HUNDO bad data:',JSON.stringify(req.body));
        res.writeHead(500);
        res.end('bad data');
        return;
    }

    // handle asyncadilly
    dataIn.processEvent(req.body);
    res.writeHead(200);
    res.end('ok');
});

// Process the startup JSON object
process.stdin.resume();
process.stdin.on('data', function(data) {
    lockerInfo = JSON.parse(data);
    locker.initClient(lockerInfo);
    locker.lockerBase = lockerInfo.lockerUrl;
    if (!lockerInfo || !lockerInfo['workingDirectory']) {
        process.stderr.write('Was not passed valid startup information.'+data+'\n');
        process.exit(1);
    }
    process.chdir(lockerInfo.workingDirectory);

    locker.connectToMongo(function(mongo) {
        // initialize all our libs
        dataStore.init(mongo.collections.place, locker);
        dataIn.init(locker, dataStore);
        app.listen(0, function() {
            var returnedInfo = {port: app.address().port};
            process.stdout.write(JSON.stringify(returnedInfo));
        });
    });
});
