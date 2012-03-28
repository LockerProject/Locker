/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// merge places from connectors

var locker = require('locker.js');

var fs = require('fs');
var sync = require('./sync');
var dataIn = require('./dataIn');
var logger;

var lockerInfo;
var express = require('express');
var connect = require('connect');
var app = express.createServer(connect.bodyParser());
var request = require('request');
var async = require('async');
var jsonStream = require("express-jsonstream");
app.use(jsonStream());

app.get('/update', function(req, res) {
    sync.gatherPlaces(req.query.type, function(){
        res.send('Making cookies for temas!');
    });
});

// way to force geo lookups for an entire set of places from a source network
app.get('/geo/:network', function(req, res) {
    sync.geoCode(req.param('network'), function(err){
        if(err) logger.error(err);
        return res.send(true);
    });
});

app.post('/events', function(req, res) {
    var q = async.queue(dataIn.addEvent, 1);
    req.jsonStream(q.push, function(error){
        if(error) console.error(error);
        res.send(200);
    });
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
    var lconfig = require('lconfig');
    lconfig.load('../../Config/config.json');
    logger = require("logger.js");
    locker.connectToMongo(function(mongo) {
        sync.init(lockerInfo.lockerUrl, mongo, locker, lconfig);
        app.listen(0, function() {
            var returnedInfo = {port: app.address().port};
            process.stdout.write(JSON.stringify(returnedInfo));
        });
    });
});