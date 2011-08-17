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

var lockerInfo;
var express = require('express'),
    connect = require('connect');
var app = express.createServer(connect.bodyParser());

app.set('views', __dirname);

app.get('/', function(req, res) {
    res.send("You should use a search interface instead of trying to talk to me directly.");
});

app.post("/events", function(req, res) {
    if (req.headers["content-type"] === "application/json" && req.body) {
        if (req.body.type === "contact/full" && req.body.action === "new") {
            lsearch.indexType("contact", req.body.obj.data, function(error, time) {
            });
            res.end();
        } else if (req.body.type === "status/twitter" && req.body.action === "new") {
            lsearch.indexType(req.body.type, req.body.obj.status, function(error, time) {
            });
            res.end();
        } else if (req.body.type) {
            lsearch.indexType(req.body.type, req.body.obj, function(error, time) {
            });
            res.end();
        } else {
            console.log("Unexpected event: " + req.body.type + " and " + req.body.action);
            res.end();
        }
    } else {
        console.log("Unexpected event or not json " + req.headers["content-type"]);
        res.end();
    }
});

app.post("/index", function(req, res) {
    if (!req.body.type || !req.body.value) {
        res.writeHead(400);
        res.end("Invalid arguments");
        return;
    }
    
    try {
        var value = JSON.parse(req.body.value);
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
    if (!q) {
        res.writeHead(400);
        res.end("Must supply at least a query");
        return;
    }
    function sendResults(err, results, queryTime) {
        if (err) {
            res.writeHead(400);
            res.end("Error querying: " + err);
            return;
        }
        var data = {};
        data.hits = results;
        data.took = queryTime;
        res.send(data);
    }
    if (type) {
        lsearch.queryType(type, q, {}, sendResults);
    } else {
        lsearch.queryAll(q, {}, sendResults);
    }
});

// Process the startup JSON object
process.stdin.resume();
var allData = "";
process.stdin.on('data', function(data) {
    allData += data;
    if (allData.indexOf("\n") > 0) {
        data = allData.substr(0, allData.indexOf("\n"));
        lockerInfo = JSON.parse(data);
        locker.initClient(lockerInfo);
        if (!lockerInfo || !lockerInfo['workingDirectory']) {
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
