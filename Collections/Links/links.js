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
var oembed = require("./oembed"); // wrapper to do best oembed possible

var lockerInfo;
var express = require('express'),
    connect = require('connect');
var app = express.createServer(connect.bodyParser());

app.set('views', __dirname);

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
        var len = (req.query["limit"] < results.length) ? req.query["limit"] : results.length;
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

app.get('/update', function(req, res) {
    dataIn.reIndex(locker, function(){
        res.writeHead(200);
        res.end('Extra mince!');
    });
});

// simple oembed util internal api
app.get('/embed', function(req, res) {
    oembed.fetch({url:req.query.url}, function(e) {
        if(e) return res.send(e);
        res.send({});
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
app.get('/', function(req, res) {
    var full = (req.query.full === true || req.query.full === "true" || req.query.full == 1);
    var fullResults = [];
    var results = [];
    var options = {sort:{"at":-1}};
    if(!req.query["all"]) options.limit = 20; // default 20 unless all is set
    if (req.query.limit) {
        options.limit = parseInt(req.query.limit);
    }
    if (req.query.offset) {
        options.offset = parseInt(req.query.offset);
    }
    var deleteLink = false;
    if (req.query.fields) {
        try {
            options.fields = JSON.parse(req.query.fields);
            // we need the link field for merging encounters and links objects
            // so get it, but flag it for deletion if not requested
            if(!options.fields.hasOwnProperty('link') || options.fields.link == 0) {
                options.fields.link = 1;
                deleteLink = true;
            }
        } catch(E) {}
    }
    var ndx = {};
    dataStore.getLinks(options, function(item) {
        if(full)
            item.encounters = [];
        ndx[item.link] = item;
        if(deleteLink) // delete the link field if it wasn't requested
            delete item.link;
        results.push(item);
    }, function(err) {
        if(full) {
            var arg = {"link":{$in: Object.keys(ndx)}};
            if(options.fields) {
                arg.fields = {};
                // extract only encounter.* fields
                for(var i in options.fields) {
                    if(i.length > 11 && i.substring(0,11) === 'encounters.')
                        arg.fields[i.substring(11)] = options.fields[i];
                }
                // we need the link field for merging encounters and links objects
                // so get it, but flag it for deletion if not requested
                if(!arg.fields.hasOwnProperty('link') || arg.fields.link == 0) {
                    arg.fields.link = 1;
                    deleteLink = true;
                }
            }
            dataStore.getEncounters(arg, function(encounter) {
                ndx[encounter.link].encounters.push(encounter);
                if(deleteLink) // delete the link field if it wasn't requested
                    delete encounter.link;
            }, function() {
                res.send(results);
            });
        } else {
            return res.send(results);
        }
    });
});

// expose way to get the list of encounters from a link id
app.get('/encounters/:id', function(req, res) {
    var encounters = [];
    dataStore.get(req.param('id'), function(err, doc) {
        if(err || !doc || !doc.link) return res.send(encounters);
        dataStore.getEncounters({link: doc.link}, function(e){ encounters.push(e); }, function(err){ res.send(encounters); });
    });
});

app.get('/id/:id', function(req, res, next) {
    if (req.param('id').length != 24) return next(req, res, next);
    dataStore.get(req.param('id'), function(err, doc) { res.send(doc); });
});

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
        dataStore.init(mongo.collections.link, mongo.collections.encounter, mongo.collections.queue, mongo);
        search.init(dataStore);
        dataIn.init(locker, dataStore, search);
        app.listen(0, 'localhost', function() {
            var returnedInfo = {port: app.address().port};
            process.stdout.write(JSON.stringify(returnedInfo));
        });
        dataIn.loadQueue();
    });
});
