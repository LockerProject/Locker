/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// merge newsfeed style data and any gather any responses

var fs = require('fs'),
    url = require('url'),
    request = require('request'),
    locker = require('../../Common/node/locker.js');
var async = require("async");
    
var dataIn = require('./dataIn'); // for processing incoming twitter/facebook/etc data types
var dataStore = require("./dataStore"); // storage/retreival of raw items and responses

var lockerInfo;
var express = require('express'),
    connect = require('connect');
var app = express.createServer(connect.bodyParser());

app.set('views', __dirname);

app.get('/', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    dataStore.getTotalItems(function(err, countInfo) {
        res.write('<html><p>Found '+ countInfo +' items</p></html>');
        res.end();
    });
});

app.get('/state', function(req, res) {
    dataStore.getTotalItems(function(err, countInfo) {
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
    dataIn.update(locker, function(){
        res.writeHead(200);
        res.end('Extra mince!');        
    });
});

app.post('/events', function(req, res) {
    if (!req.body.type || !req.body.obj || !req.body.obj.data){
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
            if(err) return res.send(err,500);
            res.send(results);
        });
    });   
}

// expose way to get items and responses in one
app.get('/getItemsFull', function(req, res) {
    var fullResults = [];
    var results = [];
    var options = {sort:{"at":-1}};
    if (req.query.limit) {
        options.limit = parseInt(req.query.limit);
    }else{
        options.limit = 100;
    }
    if (req.query.offset) {
        options.offset = parseInt(req.query.offset);
    }
    dataStore.getItems(options, function(item) { results.push(item); }, function(err) { 
        async.forEach(results, function(item, callback) {
            item.responses = [];
            dataStore.getResponses({"item":item.idr}, function(response) {
                item.responses.push(response);
            }, function() {
                fullResults.push(item);
                callback();
            });
        }, function() {
            res.send(results);
        });
    });
});
genericApi('/getItems', dataStore.getItems);
genericApi('/getResponses',dataStore.getResponses);

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
        dataStore.init(mongo.collections.item,mongo.collections.response);
        dataIn.init(locker, dataStore);
        app.listen(lockerInfo.port, 'localhost', function() {
            process.stdout.write(data);
        });
    });
});
