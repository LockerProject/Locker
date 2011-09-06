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
var lutil = require('lutil');
var serviceManager = require("lservicemanager");
var syncManager = require('lsyncmanager');
// var dashboard = require(__dirname + "/dashboard.js");
var express = require('express');
var connect = require('connect');
var request = require('request');
var sys = require('sys');
var path = require('path');
var fs = require("fs");
var url = require('url');
var lfs = require(__dirname + "/../Common/node/lfs.js");
var httpProxy = require('http-proxy');
var lpquery = require("lpquery");
var lconfig = require("lconfig");

var lcrypto = require("lcrypto");

var proxy = new httpProxy.HttpProxy();
var scheduler = lscheduler.masterScheduler;

var dashboard, devdashboard;

var locker = express.createServer(
            // we only use bodyParser to create .params for callbacks from services, connect should have a better way to do this
            function(req, res, next) {
                if (req.url.substring(0, 6) == "/core/" ) {
                    connect.bodyParser()(req, res, next);
                } else {
                    next();
                }
            },
            function(req, res, next) {
                if (req.url.substring(0, 13) == '/auth/twitter') {
                    connect.bodyParser()(req, res, next);
                } else {
                    next();
                }
            },
            connect.cookieParser(),
            connect.session({key:'locker.project.id', secret : "locker"})
        );

var synclets = require('./webservice-synclets')(locker);
var syncletAuth = require('./webservice-synclets-auth')(locker);

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
    var services = serviceManager.providers(req.param('types').split(','));
    var synclets = syncManager.providers(req.param('types').split(','));
    lutil.addAll(services, synclets);
    res.end(JSON.stringify(services));
});

locker.get("/available", function(req, res) {
    var handle = req.param('handle');
    if(!handle) {
        res.writeHead(400);
        res.end(JSON.stringify({error:'requires handle param'}));
        return;
    } else {
        var service = serviceManager.getFromAvailable(handle);
        if(!service) {
            res.writeHead(400);
            res.end(JSON.stringify({error:'handle ' + handle + ' not found'}));
            return;
        } else {
            res.writeHead(200, {"Content-Type":"application/json"});
            res.end(JSON.stringify(service));
        }
    }
})

locker.get("/encrypt", function(req, res) {
    if (!req.param("s")) {
        res.writeHead(400);
        res.end();
        return;
    }
    console.log("encrypting " + req.param("s"));
    res.end(lcrypto.encrypt(req.param("s")));
});

locker.get("/decrypt", function(req, res) {
    if (!req.param("s")) {
        res.writeHead(400);
        res.end();
        return;
    }
    res.end(lcrypto.decrypt(req.param("s")));
});

// search interface
locker.get("/query/:query", function(req, res) {
    var data = decodeURIComponent(req.originalUrl.substr(6)).replace(/%21/g, '!').replace(/%27/g, "'").replace(/%28/g, '(').replace(/%29/g, ')').replace(/%2a/ig, '*');
    try {
        var query = lpquery.buildMongoQuery(lpquery.parse(data));
        var providers = serviceManager.serviceMap().installed;
        var provider = undefined;
        for (var key in providers) {
            if (providers.hasOwnProperty(key) && providers[key].provides && providers[key].provides.indexOf(query.collection) >= 0 )
                provider = providers[key];
        }

        if (provider == undefined) {
            res.writeHead(404);
            res.end(query.collection + " not found to query");
            return;
        }

        var mongo = require("lmongoclient")(lconfig.mongo.host, lconfig.mongo.port, provider.id, provider.mongoCollections);
        mongo.connect(function(mongo) {
            try {
                var collection = mongo.collections[provider.mongoCollections[0]];
                console.log("Querying " + JSON.stringify(query));
                var options = {};
                if (query.limit) options.limit = query.limit;
                if (query.skip) options.skip = query.skip;
                collection.find(query.query, options, function(err, foundObjects) {
                    if (err) {
                        res.writeHead(500);
                        res.end(err);
                        return;
                    }

                    foundObjects.toArray(function(err, objects) {
                        res.end(JSON.stringify(objects));
                    });
                });
            } catch (E) {
                res.writeHead(500);
                res.end('Something broke while trying to query Mongo : ' + E);
            }
        });
    } catch (E) {
        res.writeHead(400);
        res.end("Invalid query " + req.originalUrl.substr(6) + "<br />" + E);
    }
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

locker.post('/core/:svcId/uninstall', function(req, res) {
    console.log('/core/:svcId/uninstal, :svcId == ' + req.params.svcId);
    var svcId = req.body.serviceId;
    if(!serviceManager.isInstalled(svcId)) {
        res.writeHead(404);
        res.end(svcId+" doesn't exist, but does anything really? ");
        return;
    }
    serviceManager.uninstall(svcId, function() {
        res.writeHead(200);
        res.end("OKTHXBI");
    });
})

locker.post('/core/:svcId/disable', function(req, res) {
    var svcId = req.body.serviceId;
    if(!serviceManager.isInstalled(svcId)) {
        res.writeHead(404);
        res.end(svcId+" doesn't exist, but does anything really? ");
        return;
    }
    serviceManager.disable(svcId);
    res.writeHead(200);
    res.end("OKTHXBI");
})

locker.post('/core/:svcId/enable', function(req, res) {
    var svcId = req.body.serviceId;
    if(!serviceManager.isDisabled(svcId)) {
        res.writeHead(404);
        res.end(svcId+" isn't disabled");
        return;
    }
    serviceManager.enable(svcId);
    res.writeHead(200);
    res.end("OKTHXBI");
})


// ME PROXY
// all of the requests to something installed (proxy them, moar future-safe)
locker.get('/Me/*', function(req,res){
    proxyRequest('GET', req, res);
});

// all of the requests to something installed (proxy them, moar future-safe)
locker.post('/Me/*', function(req,res){
    proxyRequest('POST', req, res);
});

function proxyRequest(method, req, res) {
    var slashIndex = req.url.indexOf("/", 4);
    if (slashIndex < 0) slashIndex = req.url.length;
    var id = req.url.substring(4, slashIndex);
    var ppath = req.url.substring(slashIndex);
    if (syncManager.isInstalled(id)) {
        return res.redirect(path.join('synclets', id, ppath));
    }
    if(serviceManager.isDisabled(id)) {
        res.writeHead(503);
        res.end('This service has been disabled.');
        return;
    }
    if(!serviceManager.isInstalled(id)) { // make sure it exists before it can be opened
        res.writeHead(404);
        res.end("so sad, couldn't find "+id);
        return;
    }
    if (!serviceManager.isRunning(id)) {
        console.log("Having to spawn " + id);
        var buffer = proxy.buffer(req);
        serviceManager.spawn(id,function(){
            proxied(method, serviceManager.metaInfo(id),ppath,req,res,buffer);
        });
    } else {
        proxied(method, serviceManager.metaInfo(id),ppath,req,res);
    }
    console.log("Proxy complete");
};

// DIARY
// Publish a user visible message
locker.get("/core/:svcId/diary", function(req, res) {
    var level = req.param("level") || 0;
    var message = req.param("message");
    var svcId = req.params.svcId;

    var now = new Date;
    try {
        fs.mkdirSync(lconfig.me + "/diary", 0700, function(err) {
            if (err && err.errno != process.EEXIST) console.error("Error creating diary: " + err);
        });
    } catch (E) {
        // Why do I still have to catch when it has an error callback?!
    }
    fs.mkdir(lconfig.me + "/diary/" + now.getFullYear(), 0700, function(err) {
        fs.mkdir(lconfig.me + "/diary/" + now.getFullYear() + "/" + now.getMonth(), 0700, function(err) {
            var fullPath = lconfig.me + "/diary/" + now.getFullYear() + "/" + now.getMonth() + "/" + now.getDate() + ".json";
            lfs.appendObjectsToFile(fullPath, [{"timestamp":now, "level":level, "message":message, "service":svcId}]);
            res.writeHead(200);
            res.end("{}");
        })
    });
});

// Retrieve the current days diary or the given range
locker.get("/diary", function(req, res) {
    var now = new Date;
    var fullPath = lconfig.me + "/diary/" + now.getFullYear() + "/" + now.getMonth() + "/" + now.getDate() + ".json";
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
    var action = req.body["action"] || "new";
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
    levents.fireEvent(type, svcId, action, obj);
    res.writeHead(200);
    res.end("OKTHXBI");
});

locker.use(express.static(__dirname + '/static'));

// fallback everything to the dashboard
locker.all('/dashboard*', function(req, res) {
    proxied(req.method, dashboard.instance,req.url.substring(11),req,res);
});

locker.all('/devdashboard*', function(req, res) {
    proxied(req.method, serviceManager.metaInfo('devdashboard'), req.url.substring(14), req, res);
});

locker.get('/', function(req, res) {
    res.redirect(lconfig.externalBase + '/dashboard/');
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
    if(lconfig.ui && !serviceManager.getFromAvailable(lconfig.ui)) {
        console.error('you have specified an invalid UI in your config file.  please fix it!');
        process.exit();
    }
    if(!serviceManager.isInstalled(lconfig.ui))
        serviceManager.install(serviceManager.getFromAvailable(lconfig.ui));
    serviceManager.spawn(lconfig.ui, function() {
        dashboard = {instance: serviceManager.metaInfo(lconfig.ui)};
        console.log('ui spawned');
    });
    serviceManager.spawn('devdashboard', function() {
        devdashboard = {instance: serviceManager.metaInfo('devdashboard')};
    });
    locker.listen(port);
}
