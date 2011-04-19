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
var wwwdude = require('wwwdude');
var request = require('request');
var sys = require('sys');
var fs = require("fs");
var url = require('url');
var lfs = require(__dirname + "/../Common/node/lfs.js");

var wwwdude_client = wwwdude.createClient({encoding: 'utf-8'});
var scheduler = lscheduler.masterScheduler;

var locker = express.createServer(
            connect.bodyParser(),
            connect.cookieParser());

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
locker.get('/:svcId/at', function(req, res) {
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
locker.post('/install', function(req, res) {
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

// all of the requests to something installed (proxy them, moar future-safe)
locker.get('/Me/*', function(req,res){
    var slashIndex = req.url.indexOf("/", 4);
    var id = req.url.substring(4, slashIndex);
    var ppath = req.url.substring(slashIndex+1);
    console.log("Proxying a get to " + ppath + " to service " + req.url);
    if(!serviceManager.isInstalled(id)) { // make sure it exists before it can be opened
        res.writeHead(404);
        res.end("so sad, couldn't find "+id);
        return;
    }
    if (!serviceManager.isRunning(id)) {
        console.log("Having to spawn " + id);
        serviceManager.spawn(id,function(){
            proxied('GET', serviceManager.metaInfo(id),ppath,req,res);
        });
    } else {
        proxied('GET', serviceManager.metaInfo(id),ppath,req,res);
    }
    console.log("Proxy complete");
});

// all of the requests to something installed (proxy them, moar future-safe)
locker.post('/Me/*', function(req,res){
    var slashIndex = req.url.indexOf("/", 4);
    var id = req.url.substring(4, slashIndex);
    var ppath = req.url.substring(slashIndex+1);
    console.log("Proxying a post to " + ppath + " to service " + req.url);
    if(!serviceManager.isInstalled(id)) { // make sure it exists before it can be opened
        res.writeHead(404);
        res.end("so sad, couldn't find "+id);
        return;
    }
    if (!serviceManager.isRunning(id)) {
        console.log("Having to spawn " + id);
        serviceManager.spawn(id,function(){
            proxied('POST', serviceManager.metaInfo(id),ppath,req,res);
        });
    } else {
        proxied('POST', serviceManager.metaInfo(id),ppath,req,res);
    }
    console.log("Proxy complete");
});

// Publish a user visible message
locker.post("/:svcId/diary", function(req, res) {
    var level = req.param("level") || 0;
    var message = req.param("message");
    var svcId = req.params.svcId;

    var now = new Date;
    try {
        fs.mkdirSync("Me/diary", 0700, function(err) {
            if (err) console.error("Error creating diary: " + err);
        });
    } catch (E) {
        // Why do I still have to catch when it has an error callback?!
    }
    fs.mkdir("Me/diary/" + now.getFullYear(), 0700, function(err) {
        if (err) console.log("Error for year dir: " + err);
        fs.mkdir("Me/diary/" + now.getFullYear() + "/" + now.getMonth(), 0700, function(err) {
            if (err) console.log("Error month dir: " + err);
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
            console.error("Error sending diary: " + err);
            res.write("[]");
            res.end();
            return;
        }
        res.write(file, "binary");
        res.end();
    });
    res.write
});

// anybody can listen into any service's events
locker.get('/:svcId/listen', function(req, res) {
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
locker.get("/:svcId/deafen", function(req, res) {
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
locker.post('/:svcId/event', function(req, res) {
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


function proxied(method, svc, ppath, req, res) {
    console.log("proxying " + method + " " + req.url + " to "+svc.uriLocal + ppath);
    var host = url.parse(svc.uriLocal).host;
    var cookies;
    if(!req.cookies) {
        req.cookies = {};
    } else {
        cookies = req.cookies[host];
    }
    var headers = req.headers;
    //if(cookies && cookies['connect.sid'])
    //    headers.cookie = 'connect.sid=' + cookies['connect.sid'];
    
    function doReq(method, redirect, svc, ppath, req, res) {
        request({uri:svc.uriLocal+ppath, 
                 headers:headers, 
                 method:method, 
                 followRedirect:redirect}, function(error, resp, data) {
            if(error) {
                if(resp)
                    res.writeHead(resp.statusCode);
                res.end(data);            
            } else {
                console.log(resp.headers);
                if(resp.statusCode == 200) {//success!!
                    resp.headers["Access-Control-Allow-Origin"] = "*";
                    res.writeHead(resp.statusCode, resp.headers);
                    res.write(data);
                    res.end();
                } else if(resp.statusCode == 301 || resp.statusCode == 302) { //redirect
                    var redURL = url.parse(resp.headers.location);
                    sys.debug(sys.inspect(resp.headers));
                    if(redURL.host.indexOf('localhost:') == 0 || redURL.host.indexOf('127.0.0.1:') == 0) {
                        doReq(method, true, svc, ppath, req, res);
                    } else {
                        res.writeHead(resp.statusCode, resp.headers);
                        res.write(data);
                        res.end();
                    }
                } else if(resp.statusCode == 304) { // not modified
                  res.writeHead(resp.statusCode, resp.headers);
                  res.end(data);
                } else if(resp.statusCode > 400) {
                    res.writeHead(resp.statusCode);
                    res.end(data);
                }
                //FIXME: What if the server returns an unhandled status code? The app will just hang...
            }
        });
    }
    
    doReq(method, false, svc, ppath, req, res);
}

function getCookie(headers) {
    var cookies = {};
    if(headers && headers['set-cookie']) {
        var splitCookies = headers['set-cookie'].toString().split(';');
        for(var i = 0; i < splitCookies.length; i++) {
            var cookie = splitCookies[i];
            var parts = cookie.split('=');
            var key = parts[ 0 ].trim();
            if(key == 'connect.sid') 
                return ( parts[ 1 ] || '' ).trim();
        }
    }
    return null;
}

exports.startService = function(port) {
    locker.listen(port);
}
