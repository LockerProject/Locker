/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    locker = require('../../Common/node/locker.js');
    
var lsearch = require("../../Common/node/lsearch");
var lutil = require("../../Common/node/lutil");

var lockerInfo;
var express = require('express'),
    connect = require('connect');
var request = require('request');
var async = require('async');
var app = express.createServer(connect.bodyParser());

app.set('views', __dirname);

app.get('/', function(req, res) {
    res.send("You should use a search interface instead of trying to talk to me directly.");
});

function handleError(type, action, id, error) {
    console.error('Error attempting to ' + action + ' index of type "' + type + '" and id: ' + id + ' - ' + error);
}

app.post("/events", function(req, res) {
    if (req.headers["content-type"] === "application/json" && req.body) {
        console.error('About to index the following:');
        console.error(req.body);   
        if (req.body.type === "contact/full") {
            if (req.body.action === "new" || req.body.action === "update") {
                lsearch.indexType("contacts", req.body.obj.data, function(err, time) {
                    if (err) { handleError(req.body.type, req.body.action, req.body.obj.data._id, err); }
                });
            } else if (req.body.action === "delete") {
                lsearch.deleteDocument(req.body.obj.data._id, function(err, time, docsDeleted) {
                    if (err) { handleError(req.body.type, req.body.action, req.body.obj.data._id, err); }
                    console.log('Received delete event for contact/full id: ' + req.body.obj.data._id);
                });
            }
            res.end();
        } else if (req.body.type === "status/timeline" || req.body.type === "status/tweets") {
            if (req.body.action === "new" || req.body.action === "update") {
                lsearch.indexType(req.body.type, req.body.obj.status, function(err, time) {
                    if (err) { handleError(req.body.type, req.body.action, req.body.obj.data._id, err); }
                });
            } else if (req.body.action === "delete") {
                lsearch.deleteDocument(req.body.obj.data._id, function(err, time, docsDeleted) {
                    if (err) { handleError(req.body.type, req.body.action, req.body.obj.data._id, err); }
                });
            }
            res.end();
        } else if (req.body.type) {
            if (req.body.action === "new" || req.body.action === "update") {
                lsearch.indexType(req.body.type, req.body.obj, function(err, time) {
                    if (err) { handleError(req.body.type, req.body.action, req.body.obj.data._id, err); }
                });
            } else if (req.body.action === "delete") {
                lsearch.deleteDocument(req.body.obj.data._id, function(err, time, docsDeleted) {
                    if (err) { handleError(req.body.type, req.body.action, req.body.obj.data._id, err); }
                });
            }
            res.end();
        } else {
            console.error("Unexpected event: " + req.body.type + " and " + req.body.action);
            res.end();
        }
    } else {
        console.error("Unexpected event or not json " + req.headers["content-type"]);
        res.end();
    }
});

app.post("/index", function(req, res) {
    if (!req.body.type || !req.body.value) {
        res.writeHead(400);
        res.end("Invalid arguments");
        return;
    }
    var value = {};
    try {
        value = JSON.parse(req.body.value);
    } catch(E) {
        res.writeHead(500);
        res.end("invalid json in value");
        return;
    }
    lsearch.indexType(req.body.type, value, function(error, time) {
        if (error) {
            res.writeHead(500);
            res.end("Could not index: " + error);
            return;
        }
        res.send({indexTime:time});
    });
});

app.get("/query", function(req, res) {
    var q = req.param("q");
    var type = req.param("type");

    if (!q || q === '*') {
        res.writeHead(400);
        res.end("Please supply valid query string");
        return;
    }

    function sendResults(err, results, queryTime) {
        if (err) {
            res.writeHead(500);
            res.end("Error querying: " + err);
            return;
        }

        enrichResultsWithFullObjects(results, function(err, richResults) {
            var data = {};
            data.took = queryTime;
        
            if (err) {
                data.error = err;
                data.hits = [];
                res.end(JSON.stringify(data));
            }
        
            data.error = null;
            data.hits = richResults;
            data.total = richResults.length;
            res.end(JSON.stringify(data));
        });
        
    }
    if (type) {
        lsearch.queryType(type, q, {}, sendResults);
    } else {
        lsearch.queryAll(q, {}, sendResults);
    }
});

function cullAndSortResults(results, callback) {
    async.sortBy(results, function(item, sortByCb) {
        // we concatenate the score to the type, and we use the reciprocal of the score so the sort has the best scores at the top
        sortByCb(null, item._type + (1/item.score).toFixed(3));
    },
    function(err, results) {
       callback(null, results); 
    });
}

function makeEnrichedRequest(url, item, callback) {
    request.get({uri:url}, function(err, res, body) {
        if (err) {
            console.error('Error when attempting to enrich search results: ' + err);
            callback(err);
            return;
        } 
        if (res.statusCode >= 400) {
            var error = 'Received a ' + res.statusCode + ' when attempting to enrich search results';
            console.error(error);
            callback(error);
            return;
        }

        item.fullobject = JSON.parse(body);
        callback(null);
    });
}

function enrichResultsWithFullObjects(results, callback) {
    // fetch full objects of results
    async.waterfall([
        function(waterfallCb) {
            cullAndSortResults(results, function(err, results) {
                waterfallCb(err, results);
            });
        },
        function(results, waterfallCb) {
            async.forEach(results, 
                function(item, forEachCb) {
                    var splitType = item._type.split('/');
                    if (splitType.length === 1) {
                        var url = lockerInfo.lockerUrl + '/Me/' + splitType[0] + '/' + item._id;
                        makeEnrichedRequest(url, item, forEachCb);
                    } else {
                        locker.providers(item._type, function(err, providers) {
                            async.forEach(providers,
                                function(provider, providersForEachCb) {
                                    // query /Me/:syncletId/:type/:id
                                    var url = lockerInfo.lockerUrl + '/Me/' + provider.id + '/' + splitType[0] + '/' + item._id;
                                    makeEnrichedRequest(url, item, providersForEachCb);
                                },
                                function(err) {
                                    forEachCb(null);
                                }
                            );
                        });
                    }
                }, 
                function(err) {
                    waterfallCb(err, results);
                }
            ); 
        }
    ],
    function(err, results) {        
        if (err) {  
            callback('Error when attempting to sort and enrich search results: ' + err, []);
        }
        callback(null, results);
    });
}

// Process the startup JSON object
process.stdin.resume();
var allData = "";
process.stdin.on('data', function(data) {
    allData += data;
    if (allData.indexOf("\n") > 0) {
        data = allData.substr(0, allData.indexOf("\n"));
        lockerInfo = JSON.parse(data);
        locker.initClient(lockerInfo);
        if (!lockerInfo || !lockerInfo.workingDirectory) {
            process.stderr.write('Was not passed valid startup information.'+data+'\n');
            process.exit(1);
        }
        process.chdir(lockerInfo.workingDirectory);

        lsearch.setEngine(lsearch.engines.CLucene);
        lsearch.setIndexPath(process.cwd() + "/search.index");
        
        app.listen(lockerInfo.port, 'localhost', function() {
            process.stdout.write(data);
        });
    }
});
