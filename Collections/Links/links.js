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
lconfig.load('../../Config/config.json');

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

app.get('/search', function(req, res) {
    if (!req.query.q) {
        res.send([]);
        return;
    }
    search.search(req.query["q"], function(err,results) {
        if(err) console.error(err);
        if(err || !results || results.length == 0) return res.send([]);
        var map = {};
        var links = [];
        var len = (req.query["limit"]) ? req.query["limit"] : results.length;
        for(var i=0; i < len; i++) links.push(results[i]._id);
        dataStore.getLinks({"link":{$in: links}}, function(link){
            link.encounters = [];
            map[link.link] = link;
        }, function(err){
            dataStore.getEncounters({"link":{$in: Object.keys(map)}}, function(encounter) {
                map[encounter.link].encounters.push(encounter);
            }, function() {
                var results = [];
                for(var k in map) results.push(map[k]);
                results = results.sort(function(lh, rh) {
                    return rh.at - lh.at;
                });
                res.send(results.slice(0,50));
            });
        });
    });
});

app.get("/since", function(req, res) {
    if (!req.query.id) {
        return res.send([]);
    }

    var results = [];
    dataStore.getSince(req.query.id, function(link) {
        results.push(link);
    }, function() {
        async.forEachSeries(results, function(link, callback) {
            if (!link) return;
            link.encounters = [];
            dataStore.getEncounters({"link":link.link}, function(encounter) {
                link.encounters.push(encounter);
            }, function() {
                callback();
            });
        }, function() {
            var sorted = results.sort(function(lh, rh) {
                return rh.at - lh.at;
            });
            res.send(sorted);
        });
   });
});

app.get("/since", function(req, res) {
    if (!req.query.id) {
        return res.send([]);
    }

    var results = [];
    dataStore.getSince(req.query.id, function(link) {
        results.push(link);
    }, function() {
        async.forEachSeries(results, function(link, callback) {
            if (!link) return;
            link.encounters = [];
            dataStore.getEncounters({"link":link.link}, function(encounter) {
                link.encounters.push(encounter);
            }, function() {
                callback();
            });
        }, function() {
            var sorted = results.sort(function(lh, rh) {
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
            res.end("error: "+E);
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

app.get('/ready', function(req, res) {
    dataStore.getTotalLinks(function(err, resp) {
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
    if (req.query.fields) {
        try {
            options.fields = JSON.parse(req.query.fields);
        } catch(E) {}
    }
    var ndx = {};
    dataStore.getLinks(options, function(item) {
        item.encounters = [];
        ndx[item.link] = item;
        results.push(item);
    }, function(err) {
        var arg = {"link":{$in: Object.keys(ndx)}};
        if(options.fields) arg.fields = options.fields;
        dataStore.getEncounters(arg, function(encounter) {
            ndx[encounter.link].encounters.push(encounter);
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
        app.listen(0, 'localhost', function() {
            var returnedInfo = {port: app.address().port};
            process.stdout.write(JSON.stringify(returnedInfo));
        });
        dataIn.loadQueue();
    });
});
