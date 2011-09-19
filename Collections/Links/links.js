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
    url = require('url'),
    request = require('request'),
    lconfig = require('../../Common/node/lconfig.js');
    locker = require('../../Common/node/locker.js');
var async = require("async");

var dataIn = require('./dataIn'); // for processing incoming twitter/facebook/etc data types
var dataStore = require("./dataStore"); // storage/retreival of raw links and encounters
var util = require("./util"); // handy things for anyone and used within dataIn
var search = require("./search"); // our indexing and query magic

var lockerInfo;
var express = require('express'),
    connect = require('connect');
var app = express.createServer(connect.bodyParser());

app.set('views', __dirname);

app.get('/', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    dataStore.getTotalLinks(function(err, countInfo) {
        res.write('<html><p>Found '+ countInfo +' links</p></html>');
        res.end();
    });
});

app.get('/state', function(req, res) {
    dataStore.getTotalLinks(function(err, countInfo) {
        if(err) return res.send(err, 500);
        var updated = new Date().getTime();
        try {
            var js = JSON.parse(fs.readFileSync('state.json'));
            if(js && js.updated) updated = js.updated;
        } catch(E) {}
        res.send({ready:1, count:countInfo, updated:updated});
    });
});

app.get('/search', function(req, res) {
    if (!req.query.q) {
        res.send([]);
        return;
    }
    search.search(req.query["q"], function(err,results) {
        if(err || !results || results.length == 0) return res.send([]);
        var fullResults = [];
        async.forEach(results, function(item, callback) {
            dataStore.getFullLink(item._id, function(link) {
                if (!link) {
                    console.error("skipping not found: "+item._id);
                    return callback();
                }
                link.at = item.at;
                link.encounters = [];
                dataStore.getEncounters({"link":link.link}, function(encounter) {
                    link.encounters.push(encounter);
                }, function() {
                    fullResults.push(link);
                    callback();
                });
            });
        }, function() {
            // Done
            var sorted = fullResults.sort(function(lh, rh) {
                return rh.at - lh.at;
            });
            res.send(sorted);
        });
    });
});

app.get('/update', function(req, res) {
    dataIn.reIndex(locker, function(){
        res.writeHead(200);
        res.end('Extra mince!');
    });
});

// just add embedly key and return result: http://embed.ly/docs/endpoints/1/oembed
// TODO: should do smart caching
app.get('/embed', function(req, res) {
    // TODO: need to load from apiKeys the right way
    var embedly = url.parse("http://api.embed.ly/1/oembed");
    embedly.query = req.query;
    embedly.query.key = "4f95c324c9dc11e083104040d3dc5c07";
    request.get({uri:url.format(embedly)},function(err,resp,body){
        var js;
        try{
            if(err) throw err;
            js = JSON.parse(body);
        }catch(E){
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end(err);
            return;
        }
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(js));
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

// expose way to get raw links and encounters
app.get('/getLinksFull', function(req, res) {
    var fullResults = [];
    var results = [];
    var options = {sort:{"at":-1}};
    if (req.query.limit) {
        options.limit = parseInt(req.query.limit);
    }
    if (req.query.offset) {
        options.offset = parseInt(req.query.offset);
    }
    dataStore.getLinks(options, function(item) { results.push(item); }, function(err) {
        async.forEach(results, function(link, callback) {
            link.encounters = [];
            dataStore.getEncounters({"link":link.link}, function(encounter) {
                link.encounters.push(encounter);
            }, function() {
                fullResults.push(link);
                callback();
            });
        }, function() {
            res.send(results);
        });
    });
});
genericApi('/getLinks', dataStore.getLinks);
genericApi('/getEncounters',dataStore.getEncounters);

// expose all utils
for(var f in util)
{
    if(f == 'init') continue;
    genericApi('/'+f,util[f]);
}

// catch exceptions, links are very garbagey
if (lconfig.airbrakeKey) {
    var airbrake = require('airbrake').createClient(lconfig.airbrakeKey);
    airbrake.handleExceptions();
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
        dataStore.init(mongo.collections.link,mongo.collections.encounter,mongo.collections.queue);
        search.init(dataStore);
        dataIn.init(locker, dataStore, search);
        app.listen(lockerInfo.port, 'localhost', function() {
            process.stdout.write(data);
        });
        dataIn.loadQueue();
    });
});
