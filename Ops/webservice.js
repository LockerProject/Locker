/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var url = require("url");
var http = require('http');
var request = require('request');
var lscheduler = require("lscheduler");
var levents = require("levents");
var serviceManager = require("lservicemanager");
var dashboard = require(__dirname + "/dashboard.js");
var express = require('express');
var connect = require('connect');
var request = require('request');
var sys = require('sys');
var fs = require("fs");
var url = require('url');
var lfs = require(__dirname + "/../Common/node/lfs.js");
var httpProxy = require('http-proxy');

var proxy = new httpProxy.HttpProxy();
var scheduler = lscheduler.masterScheduler;

var locker = express.createServer(
            // we only use bodyParser to create .params for callbacks from services, connect should have a better way to do this
            function(req, res, next) {
                if (req.url.substring(0, 6) == "/core/" ) {
                    connect.bodyParser()(req, res, next);
                } else {
                    next();
                }
            }
            );


var listeners = new Object(); // listeners for events

// return the known map of our world
locker.get('/map', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/javascript',
        "Access-Control-Allow-Origin" : "*" 
    });
    res.end(JSON.stringify(serviceManager.serviceMap()));
});

locker.get("/providers", function(req, res) {
    console.log("Looking for providers of type " + req.param("types"));
    if (!req.param("types")) {
        res.writeHead(400);
        res.end("[]");
        return;
    }
    res.writeHead(200, {"Content-Type":"application/json"});
    res.end(JSON.stringify(serviceManager.providers(req.param("types").split(","))));
});

// let any service schedule to be called, it can only have one per uri
locker.get('/core/:svcId/at', function(req, res) {
    var seconds = req.param("at");
    var cb = req.param('cb');
    var svcId = req.params.svcId;
    if (!seconds || !svcId || !cb) {
        res.writeHead(400);
        res.end("Invalid arguments");
        return;
    }
    if (!serviceManager.isInstalled(svcId)) {
        res.writeHead(404);
        res.end(svcId+" doesn't exist, but does anything really? ");
        return;
    }
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    at = new Date;
    at.setTime(seconds * 1000);
    scheduler.at(at, svcId, cb);
    console.log("scheduled "+ svcId + " " + cb + "  at " + at);
    res.end("true");
});

// given a bunch of json describing a service, make a home for it on disk and add it to our map
locker.post('/core/:svcId/install', function(req, res) {
    if (!req.body.hasOwnProperty("srcdir")) {
        res.writeHead(400);
        res.end("{}")
        return;
    }
    var metaData = serviceManager.install(req.body);
    if (!metaData) {
        res.writeHead(404);
        res.end("{}");
        return;
    }
    res.writeHead(200, {
        'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(metaData));
});


// ME PROXY
// all of the requests to something installed (proxy them, moar future-safe)
locker.get('/Me/*', function(req,res){
    var slashIndex = req.url.indexOf("/", 4);
    if (slashIndex < 0) slashIndex = req.url.length;
    var id = req.url.substring(4, slashIndex);
    var ppath = req.url.substring(slashIndex);
    console.log("Proxying a get to " + ppath + " to service " + req.url);
    if(!serviceManager.isInstalled(id)) { // make sure it exists before it can be opened
        res.writeHead(404);
        res.end("so sad, couldn't find "+id);
        return;
    }
    if (!serviceManager.isRunning(id)) {
        console.log("Having to spawn " + id);
        var buffer = proxy.buffer(req);
        serviceManager.spawn(id,function(){
            proxied('GET', serviceManager.metaInfo(id),ppath,req,res,buffer);
        });
    } else {
        proxied('GET', serviceManager.metaInfo(id),ppath,req,res);
    }
    console.log("Proxy complete");
});

// all of the requests to something installed (proxy them, moar future-safe)
locker.post('/Me/*', function(req,res){
    var slashIndex = req.url.indexOf("/", 4);
    if (slashIndex < 0) slashIndex = req.url.length;
    var id = req.url.substring(4, slashIndex);
    var ppath = req.url.substring(slashIndex);
    sys.debug("Proxying a post to " + ppath + " to service " + req.url);
    console.log("Proxying a post to " + ppath + " to service " + req.url);
    if(!serviceManager.isInstalled(id)) { // make sure it exists before it can be opened
        res.writeHead(404);
        res.end("so sad, couldn't find "+id);
        return;
    }
    if (!serviceManager.isRunning(id)) {
        console.log("Having to spawn " + id);
        var buffer = proxy.buffer(req);
        serviceManager.spawn(id,function(){
            proxied('POST', serviceManager.metaInfo(id),ppath,req,res,buffer);
        });
    } else {
        proxied('POST', serviceManager.metaInfo(id),ppath,req,res);
    }
    console.log("Proxy complete");
});


// DIARY
// Publish a user visible message
locker.get("/core/:svcId/diary", function(req, res) {
    var level = req.param("level") || 0;
    var message = req.param("message");
    var svcId = req.params.svcId;

    var now = new Date;
    try {
        fs.mkdirSync("Me/diary", 0700, function(err) {
            if (err && err.errno != process.EEXIST) console.error("Error creating diary: " + err);
        });
    } catch (E) {
        // Why do I still have to catch when it has an error callback?!
    }
    fs.mkdir("Me/diary/" + now.getFullYear(), 0700, function(err) {
        fs.mkdir("Me/diary/" + now.getFullYear() + "/" + now.getMonth(), 0700, function(err) {
            var fullPath = "Me/diary/" + now.getFullYear() + "/" + now.getMonth() + "/" + now.getDate() + ".json";
            lfs.appendObjectsToFile(fullPath, [{"timestamp":now, "level":level, "message":message, "service":svcId}]);
            res.writeHead(200);
            res.end("{}");
        })
    });
});

// Retrieve the current days diary or the given range
locker.get("/diary", function(req, res) {
    var now = new Date;
    var fullPath = "Me/diary/" + now.getFullYear() + "/" + now.getMonth() + "/" + now.getDate() + ".json";
    res.writeHead(200, {
        "Content-Type": "text/javascript",
        "Access-Control-Allow-Origin" : "*" 
    });
    fs.readFile(fullPath, function(err, file) {
        if (err) {
            res.write("[]");
            res.end();
            return;
        }
        var rawLines   = file.toString().trim().split("\n");
            diaryLines = rawLines.map(function(line) { return JSON.parse(line) });
        res.write(JSON.stringify(diaryLines), "binary");
        res.end();
    });
    res.write
});


// EVENTING
// anybody can listen into any service's events
locker.get('/core/:svcId/listen', function(req, res) {
    var type = req.param('type'), cb = req.param('cb');
    var svcId = req.params.svcId;
    if(!serviceManager.isInstalled(svcId)) {
        console.log("Could not find " + svcId);
        res.writeHead(404);
        res.end(svcId+" doesn't exist, but does anything really? ");
        return;
    }
    if (!type || !cb) {
        res.writeHead(400);
        res.end("Invalid type or callback");
        return;
    }
    if(cb.substr(0,1) != "/") cb = '/'+cb; // ensure it's a root path
    levents.addListener(type, svcId, cb);
    res.writeHead(200);
    res.end("OKTHXBI");
});

// Stop listening to some events
locker.get("/core/:svcId/deafen", function(req, res) {
    var type = req.param('type'), cb = req.param('cb');
    var svcId = req.params.svcId;
    if(!serviceManager.isInstalled(svcId)) {
        res.writeHead(404);
        res.end(svcId+" doesn't exist, but does anything really? ");
        return;
    }
    if (!type || !cb) {
        res.writeHead(400);
        res.end("Invalid type or callback");
        return;
    }
    if(cb.substr(0,1) != "/") cb = '/'+cb; // ensure it's a root path
    levents.removeListener(type, svcId, cb);
    res.writeHead(200);
    res.end("OKTHXBI");
});

// publish an event to any listeners
locker.post('/core/:svcId/event', function(req, res) {
    if (!req.body ) {
        res.writeHead(400);
        res.end("Post data missing");
        return;
    }
    var type = req.body['type'], obj = req.body['obj'];
    var svcId = req.params.svcId;
    if(!serviceManager.isInstalled(svcId)) {
        res.writeHead(404);
        res.end(svcId+" doesn't exist, but does anything really? ");
        return;
    }
    if (!type || !obj) {
        res.writeHead(400);
        res.end("Invalid type or object");
        return;
    }
    levents.fireEvent(type, svcId, obj);
    res.writeHead(200);
    res.end("OKTHXBI");
});


// fallback everything to the dashboard
locker.get('/*', function(req, res) {
    proxied('GET', dashboard.instance,req.url.substring(1),req,res);
});

// fallback everything to the dashboard
locker.post('/*', function(req, res) {
    proxied('POST', dashboard.instance,req.url.substring(1),req,res);
});

locker.get('/', function(req, res) {
    proxied('GET', dashboard.instance,"",req,res);
});

function proxied(method, svc, ppath, req, res, buffer) {
    if(ppath.substr(0,1) != "/") ppath = "/"+ppath;
    console.log("proxying " + method + " " + req.url + " to "+ svc.uriLocal + ppath);
    req.url = ppath;
    proxy.proxyRequest(req, res, {
      host: url.parse(svc.uriLocal).hostname,
      port: url.parse(svc.uriLocal).port,
      buffer: buffer
    });
}

exports.startService = function(port) {
    locker.listen(port);
}
