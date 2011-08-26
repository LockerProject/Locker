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
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    dataStore.getTotalPlaces(function(err, countInfo) {
        res.write('<html><p>Found '+ countInfo +' places</p></html>');
        res.end();
    });
});

app.get('/state', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'application/json'
    });
    dataStore.getTotalPlaces(function(err, countInfo) {
        res.write('{"updated":'+new Date().getTime()+',"ready":1,"count":'+ countInfo +'}');
        res.end();
    });
});

app.get('/reindex', function(req, res) {
    dataIn.reIndex(locker);
    res.writeHead(200);
    res.end('Making cookies for temas!');
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

function genericApi(name,f)
{
    app.get(name,function(req,res){
        var results = [];
        f(req.query,function(item){results.push(item);},function(err){
            if(err)
            {
                res.writeHead(500, {'Content-Type': 'text/plain'});
                res.end(err);
            }else{
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(results));
            }
        });
    });   
}


genericApi('/getPlaces', dataStore.getPlaces);
// expose all utils
for(var f in util)
{
    if(f == 'init') continue;
    genericApi('/'+f,util[f]);
}

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
        dataStore.init(mongo.collections.place);
        dataIn.init(locker, dataStore);
        app.listen(lockerInfo.port, 'localhost', function() {
            process.stdout.write(data);
        });
    });
});
