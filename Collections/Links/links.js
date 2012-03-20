/*
 *
 * Copyright (C) 2011-2012, The Locker Project
 * All rights reserved.
 *
 * Please see the LICENSE file for more information.
 *
 */

// merge links from connectors

var fs = require('fs')
  , url = require('url')
  , request = require('request')
  , lconfig = require('lconfig.js')
  , locker = require('locker.js')
  , async = require("async")
  , crypto = require("crypto")
  , jsonStream = require("express-jsonstream")
  , logger;


var dataIn = require('./dataIn')       // for processing incoming twitter/facebook/etc data types
  , dataStore = require("./dataStore") // storage/retreival of raw links and encounters
  , util = require("./util")           // handy things for anyone and used within dataIn
  , oembed = require("./oembed");      // wrapper to do best oembed possible

var lockerInfo;
var express = require('express'),
    connect = require('connect');

var app = express.createServer(connect.bodyParser());

app.use(jsonStream());

app.set('views', __dirname);

app.get('/update', function (req, res) {
    dataIn.reIndex(locker, function () {
        res.writeHead(200);
        res.end('Extra mince!');
    });
});

// simple oembed util internal api
app.get('/embed', function (req, res) {
    if (!dataIn.process) return res.send({});
    oembed.fetch({url:req.query.url}, function (e) {
        if(e) return res.send(e);
        res.send({});
    });
});

app.post('/events', function (req, res) {
  var q = async.queue(dataIn.processEvent, 1);
  req.jsonStream(q.push, function (error) {
      if(error) logger.error(error);
      res.send(200);
  });
});

function genericApi(name,f) {
    app.get(name, function (req,res) {
        var results = [];
        f(req.query, function (item) { results.push(item); }, function (err) {
            if(err) {
                res.writeHead(500, {'Content-Type': 'text/plain'});
                res.end(err);
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(results));
            }
        });
    });
}

// expose all utils
for (var f in util) {
    if (f == 'init') continue;
    genericApi('/'+f,util[f]);
}

// catch exceptions, links are very garbagey
if (lconfig.airbrakeKey) {
    var airbrake = require('airbrake').createClient(lconfig.airbrakeKey);
    airbrake.handleExceptions();
}

// Process the startup JSON object
process.stdin.resume();
process.stdin.on('data', function (data) {
    lockerInfo = JSON.parse(data);
    locker.initClient(lockerInfo);
    locker.lockerBase = lockerInfo.lockerUrl;
    if (!lockerInfo || !lockerInfo.workingDirectory) {
        process.stderr.write('Was not passed valid startup information.'+data+'\n');
        process.exit(1);
    }
    process.chdir(lockerInfo.workingDirectory);
    lconfig.load('../../Config/config.json');
    logger = require("logger");

    locker.connectToMongo(function (mongo) {
        // initialize all our libs
        dataStore.init(mongo, locker);
        dataIn.init(locker, dataStore, logger);
        app.listen(0, 'localhost', function () {
            var returnedInfo = {port: app.address().port};
            process.stdout.write(JSON.stringify(returnedInfo));
        });
        dataIn.loadQueue();
    });
});
