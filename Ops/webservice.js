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
var express = require('express');
var connect = require('connect');
var request = require('request');
var sys = require('sys');
var path = require('path');
var fs = require("fs");
var url = require('url');
var querystring = require("querystring");
var lfs = require(__dirname + "/../Common/node/lfs.js");
var httpProxy = require('http-proxy');
var lpquery = require("lpquery");
var lconfig = require("lconfig");
var logger = require('logger');
var async = require('async');

var lcrypto = require("lcrypto");

var proxy = new httpProxy.RoutingProxy();
var scheduler = lscheduler.masterScheduler;

var locker = express.createServer(
    // we only use bodyParser to create .params for callbacks from services, connect should have a better way to do this
    function(req, res, next) {
        if (req.url.substring(0, 6) == "/core/" || req.url.substring(0, 6) == '/push/' || req.url.substring(0, 6) == '/post/') {
            connect.bodyParser()(req, res, next);
        } else {
            next();
        }
    },
    function(req, res, next) {
        if (req.url.substring(0, 6) == '/auth/') {
            connect.bodyParser()(req, res, next);
        } else {
            next();
        }
    },
    connect.cookieParser(),
    connect.session({key:'locker.project.id', secret : "locker"})
);


var listeners = new Object(); // listeners for events

var DEFAULT_QUERY_LIMIT = 20;

// return the known map of our world
locker.get('/map', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/javascript',
        "Access-Control-Allow-Origin" : "*"
    });
    res.end(JSON.stringify(serviceManager.map()));
});


locker.post('/map/upsert', function(req, res) {
    logger.info("Upserting " + req.param("manifest"));
    res.send(serviceManager.mapUpsert(req.param("manifest")));
});

locker.get("/providers", function(req, res) {
    if (!req.param("types")) return res.send([], 400);
    res.send(serviceManager.providers(req.param('types').split(',')));
});

locker.get("/provides", function(req, res) {
    var services = serviceManager.map();
    var ret = {};
    for(var i in services) if(services[i].provides) ret[i] = services[i].provides;
    res.send(ret);
});

locker.get("/encrypt", function(req, res) {
    if (!req.param("s")) {
        res.writeHead(400);
        res.end();
        return;
    }
    logger.info("encrypting " + req.param("s"));
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
    if(!url.parse(req.originalUrl).query)
        req.originalUrl += "?limit=" + DEFAULT_QUERY_LIMIT;
    var data = decodeURIComponent(req.originalUrl.substr(6)).replace(/%21/g, '!').replace(/%27/g, "'").replace(/%28/g, '(').replace(/%29/g, ')').replace(/%2a/ig, '*');
    try {
        var query = lpquery.buildMongoQuery(lpquery.parse(data));
        var providers = serviceManager.map();
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

        var mongo = require("lmongo");
        mongo.init(provider.id, provider.mongoCollections, function(mongo, colls) {
            try {
                var collection = colls[provider.mongoCollections[0]];
                logger.info("Querying " + JSON.stringify(query));
                var options = {};
                options.limit = query.limit || DEFAULT_QUERY_LIMIT;
                if (query.skip) options.skip = query.skip;
                if (query.fields) options.fields = query.fields;
                if (query.sort) options.sort = query.sort;
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
    if (!serviceManager.map(svcId)) {
        res.writeHead(404);
        res.end(svcId+" doesn't exist, but does anything really? ");
        return;
    }
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var at = new Date;
    at.setTime(seconds * 1000);
    scheduler.at(at, svcId, cb);
    logger.info("scheduled "+ svcId + " " + cb + "  at " + at);
    res.end("true");
});

// ME PROXY
// all of the requests to something installed (proxy them, moar future-safe)
locker.get(/^\/Me\/([^\/]*)(\/?.*)?\/?/, function(req,res, next){
    // ensure the ending slash - i.e. /Me/foo ==>> /Me/foo/
    if(!req.params[1]) {
        var url = "/Me/" + req.params[0];
        if (!req.params[1]) {
            url += "/"
        } else {
            url += req.params[1];
        }
        var qs = querystring.stringify(req.query);
        if (qs.length > 0) {
            url += "?" + qs
        }
        res.header("Location", url);
        res.send(302);
    } else {
        logger.verbose("GET proxy of " + req.originalUrl);
        proxyRequest('GET', req, res, next);
    }
});

// all posts just pass
locker.post('/Me/*', function(req,res, next){
    logger.verbose("POST proxy of " + req.originalUrl);
    proxyRequest('POST', req, res, next);
});

locker.get('/synclets/:id/run', function(req, res) {
    syncManager.syncNow(req.params.id, req.query.id, false, function() {
        res.send(true);
    });
});

// this will pass the post body to the synclet and run it immediately
locker.post('/post/:id/:synclet', function(req, res) {
    syncManager.syncNow(req.params.id, req.params.synclet, req.body, function() {
        res.send(true);
    });
});

// all synclet getCurrent, id, etc stuff
require('synclet/dataaccess')(locker);

function proxyRequest(method, req, res, next) {
    var slashIndex = req.url.indexOf("/", 4);
    if (slashIndex < 0) slashIndex = req.url.length;
    var id = req.url.substring(4, slashIndex);
    var ppath = req.url.substring(slashIndex);
    var info = serviceManager.map(id);
    if (!info) return res.send(404);
    // if there's synclets, handled by their own built-ins
    if (info.synclets) {
        req.url = req.url.replace('Me', 'synclets');
        return next();
    }
    if (info.static === true || info.static === "true") {
        // This is a static file we'll try and serve it directly
        logger.verbose("Checking " + req.url);
        var fileUrl = url.parse(ppath);
        if(fileUrl.pathname.indexOf("..") >= 0)
        { // extra sanity check
            return res.send(404);
        }

        fs.stat(path.join(info.srcdir, "static", fileUrl.pathname), function(err, stats) {
            if (!err && (stats.isFile() || stats.isDirectory())) {
                res.sendfile(path.join(info.srcdir, "static", fileUrl.pathname));
            } else {
                fs.stat(path.join(info.srcdir, fileUrl.pathname), function(err, stats) {
                    if (!err && (stats.isFile() || stats.isDirectory())) {
                        res.sendfile(path.join(info.srcdir, fileUrl.pathname));
                    } else {
                        logger.warn("Could not find " + path.join(info.srcdir, fileUrl.pathname))
                        res.send(404);
                    }
                });
            }
        });
        logger.verbose("Sent static file " + path.join(info.srcdir, "static", fileUrl.pathname));
    } else {
        if (!serviceManager.isRunning(id)) {
            logger.info("Having to spawn " + id);
            var buffer = httpProxy.buffer(req);
            serviceManager.spawn(id,function(){
                proxied(method, info, ppath, req, res, buffer);
            });
        } else {
            proxied(method, info, ppath, req, res);
        }
    }
    logger.verbose("Proxy complete");
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
            if (err && err.errno != process.EEXIST) logger.error("Error creating diary: " + err);
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
        var diaryLines = rawLines.map(function(line) { return JSON.parse(line) });
        res.write(JSON.stringify(diaryLines), "binary");
        res.end();
    });
    res.write
});

locker.get('/core/revision', function(req, res) {
    fs.readFile(path.join(lconfig.lockerDir, lconfig.me, 'gitrev.json'), function(err, doc) {
        if (doc) res.send(JSON.parse(doc));
        else res.send("git cmd not available!");
    });
});

locker.get('/core/selftest', function(req, res) {
    async.series([
        function(callback) {
            fs.readdir(lconfig.me, function(err, files) {
                if (err) {
                    callback({ 'Me/*' : err}, null);
                } else {
                    callback(null, { 'Me/*' : files });
                }
            });
        },
    ],
    function(err, results) {
        if (err) {
            res.send(err, 500);
        } else {
            res.send(JSON.stringify(results), 200);
        }
    });
});

// EVENTING
// anybody can listen into any service's events
locker.get('/core/:svcId/listen', function(req, res) {
    var type = req.param('type'), cb = req.param('cb');
    var svcId = req.params.svcId;
    if(!serviceManager.map(svcId)) {
        logger.error("Could not find " + svcId);
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
    if(!serviceManager.map(svcId)) {
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
    var fromService = serviceManager.map(req.params.svcId);
    if(!fromService) {
        res.writeHead(404);
        res.end(req.params.svcId+" doesn't exist, but does anything really? ");
        return;
    }
    fromService.last = Date.now();
    if (!req.body.idr || !req.body.data || !req.body.action) {
        res.writeHead(400);
        res.end("Invalid, missing idr, data, or action");
        return;
    }
    levents.fireEvent(req.body.idr, req.body.action, req.body.data);
    res.writeHead(200);
    res.end("OKTHXBI");
});

// manually flush any waiting synclets, useful for debugging/testing
locker.get('/flush', function(req, res) {
    res.send(true);
    syncManager.flushTolerance(function(err){
        if(err) logger.error("got error when flushing synclets: "+err);
    }, req.query.force);
});

locker.use(express.static(__dirname + '/static'));

// fallback everything to the dashboard
locker.all('/dashboard*', function(req, res) {
    if(!lconfig.ui || !serviceManager.map(lconfig.ui)) return res.send("no dashboard :(", 404);
    req.url = '/Me/' + lconfig.ui + '/' + req.url.substring(11);
    proxyRequest(req.method, req, res);
    // detect when coming back from idle, and flush any delayed synclets if configured to do so
    if(locker.last && lconfig.tolerance.idle && (Date.now() - locker.last) > (lconfig.tolerance.idle * 1000)) syncManager.flushTolerance(function(err){
        if(err) logger.error("got error when flushing synclets: "+err);
    });
    locker.last = Date.now();
});

locker.all("/socket.io*", function(req, res) {
    if(!lconfig.ui || !serviceManager.map(lconfig.ui)) return res.send("no dashboard :(", 404);
    req.url = '/Me/' + lconfig.ui + req.url;
    proxyRequest(req.method, req, res);
});

locker.get('/', function(req, res) {
    res.redirect(lconfig.externalBase + '/dashboard/');
});

require('./webservice-push')(locker);


function proxied(method, svc, ppath, req, res, buffer) {
    svc.last = Date.now();
    if(ppath.substr(0,1) != "/") ppath = "/"+ppath;
    logger.verbose("proxying " + method + " " + req.url + " to "+ svc.uriLocal + ppath);
    req.url = ppath;
    proxy.proxyRequest(req, res, {
      host: url.parse(svc.uriLocal).hostname,
      port: url.parse(svc.uriLocal).port,
      buffer: buffer
    });
}

exports.startService = function(port, cb) {
    locker.listen(port, function(){
        cb(locker);
    });
}
