var url = require("url");
var http = require('http');
var request = require('request');
var lscheduler = require("lscheduler");
var serviceManager = require("lservicemanager");
var dashboard = require(__dirname + "/dashboard.js");
var express = require('express');
var connect = require('connect');
var wwwdude = require('wwwdude');
var sys = require('sys');
var fs = require("fs");
var lfs = require(__dirname + "/../Common/node/lfs.js");

var wwwdude_client = wwwdude.createClient({encoding: 'utf-8'});
var scheduler = lscheduler.masterScheduler;

var locker = express.createServer(
            connect.bodyParser(),
            connect.cookieParser(),
            connect.session({secret : "locker"}));

var listeners = new Object(); // listeners for events

// make sure the value of the key is an array and insert the item
function insertSafe(obj,key,item) {
    console.log("inserting into "+key+": "+JSON.stringify(item))
    if(!obj[key]) obj[key] = new Array();
    obj[key].push(item);
}

// return the known map of our world
locker.get('/map',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/javascript',
        "Access-Control-Allow-Origin" : "*" 
    });
    res.end(JSON.stringify(serviceManager.serviceMap()));
});

// let any service schedule to be called, it can only have one per uri
locker.get('/at',
function(req, res) {
    var seconds = req.param("at");
    var svcId = req.param('id'), cb = req.param('cb');
    if (!seconds || !svcId || !cb) {
        res.writeHead(400);
        res.end("Invalid arguments");
        return;
    }
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    at = new Date;
    at.setTime(seconds * 1000);
    scheduler.at(at, svcId, cb);
    if (!serviceManager.isInstalled(svcId)) {
        res.writeHead(404);
        res.end(id+" doesn't exist, but does anything really? ");
        return;
    }
    console.log("scheduled "+ svcId + " " + cb + "  at " + at);
    res.end("true");
});

// given a bunch of json describing a service, make a home for it on disk and add it to our map
locker.post('/install',
function(req, res) {
    console.log('/install');
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    console.log("installing "+req.rawBody);
    var js = JSON.parse(req.rawBody);
    serviceManager.install(js);
    res.end(JSON.stringify(js));
});

// all of the requests to something installed (proxy them, moar future-safe)
locker.get('/Me/*', function(req,res){
    var id = req.url.substring(4,36);
    var ppath = req.url.substring(37);
    if(!serviceManager.isInstalled(id)) { // make sure it exists before it can be opened
        res.writeHead(404);
        res.end("so sad, couldn't find "+id);
        return;
    }
    if (!serviceManager.isRunning(id)) {
        serviceManager.spawn(id,function(){
            proxied(serviceManager.metaInfo(id),ppath,req,res);
        });
    } else {
        proxied(serviceManager.metaInfo(id),ppath,req,res);
    }
});

// all of the requests to something installed (proxy them, moar future-safe)
locker.post('/Me/*', function(req,res){
    var id = req.url.substring(4,36);
    var ppath = req.url.substring(37);
    if(!serviceManager.isInstalled(id)) { // make sure it exists before it can be opened
        res.writeHead(404);
        res.end("so sad, couldn't find "+id);
        return;
    }
    if (!serviceManager.isRunning(id)) {
        serviceManager.spawn(id,function(){
            proxiedPost(serviceManager.metaInfo(id),ppath,req,res);
        });
    } else {
        proxiedPost(serviceManager.metaInfo(id),ppath,req,res);
    }
});

// Publish a user visible message
locker.post("/diary", function(req, res) {
    var level = req.param("level") || 0;
    var message = req.param("message");

    var now = new Date;
    try {
        fs.mkdirSync("Me/diary", 0700, function(err) {
            if (err) console.error("Error creating diary: " + err);
        });
    } catch (E) {
        // Why do I still have to catch when it has an error callback?!
    }
    fs.mkdir("Me/diary/" + now.getFullYear(), 0700, function(err) {
        console.log("Error for year dir: " + err);
        fs.mkdir("Me/diary/" + now.getFullYear() + "/" + now.getMonth(), 0700, function(err) {
            console.log("Error month dir: " + err);
            var fullPath = "Me/diary/" + now.getFullYear() + "/" + now.getMonth() + "/" + now.getDate() + ".json";
            lfs.appendObjectsToFile(fullPath, [{"timestamp":now, "level":level, "message":message}]);
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
locker.get('/listen',
function(req, res) {
    var id = req.param('id'), type = req.param('type'), cb = req.param('cb'), from = req.param('from');
    if(!serviceManager.isInstalled(id) || !serviceManager.isInstalled(from)) {
        res.writeHead(404);
        res.end(id+" doesn't exist, but does anything really? ");
        return;
    }
    if(cb.substr(0,1) != "/") cb = '/'+cb; // ensure it's a root path
    res.writeHead(200);
    res.end("OKTHXBI");
    // really simple datastructure for now: listeners["5e99c869b5fbe2be1f66e17894e92364=contact/facebook"][0]="241a4b440371069305c340bed2cf69ec/cb/path"
    insertSafe(listeners,id+"="+type,from+cb);
    console.log("new listener "+id+" "+type+" at "+id+cb);
});

// publish an event to any listeners
locker.post('/event',
function(req, res) {
    var sourceID = req.param('src_id'), type = req.param('type'), objectID = req.param('obj_id');
    res.writeHead(200);
    res.end();
    console.log("new event from "+sourceID+" "+type);
    var list = listeners[sourceID+'='+type];
    if(!list || list.length == 0) return;
    for(var i in list)
    {
        var to = list[i].substr(0,32);
        var path = list[i].substr(32);
        console.log("publishing new event to "+to+" at "+path);
        if(!serviceManager.isInstalled(to)) continue;
        if(!serviceManager.isRunning(to)) continue; // start up?? probably?
        var uri = url.parse(serviceManager.metaInfo(to).uriLocal);
        // cuz http client is dumb and doesn't work on localhost w/ no dns?!?! srsly
        if(uri.hostname == "localhost" || uri.hostname == "127.0.0.1")
        {
            var httpClient = http.createClient(uri.port);            
        }else{
            var httpClient = http.createClient(uri.port,uri.host);            
        }
        var request = httpClient.request('POST', path, {'Content-Type':'application/x-www-form-urlencoded'});
        request.write('src_id=' + encodeURIComponent(sourceID) + '&type=' + encodeURIComponent(type) + '&obj_id=' + encodeURIComponent(objectID));
        // !!!! need to catch errors and remove this from the list
        request.end();
    }
});

// fallback everything to the dashboard
locker.get('/*',
function(req, res) {
    proxied(dashboard.instance,req.url.substring(1),req,res);
});

// fallback everything to the dashboard
locker.post('/*',
function(req, res) {
    proxiedPost(dashboard.instance,req.url.substring(1),req,res);
});

locker.get('/',
function(req, res) {
    proxied(dashboard.instance,"",req,res);
});


function proxied(svc, ppath, req, res) {
    console.log("proxying " + req.url + " to "+svc.uriLocal + ppath);
    var host = url.parse(svc.uriLocal).host;
    var cookies;
    if(!req.cookies) {
        req.cookies = {};
    } else {
        cookies = req.cookies[host];
    }
    var headers = req.headers;
    if(cookies && cookies['connect.sid'])
        headers.cookie = 'connect.sid=' + cookies['connect.sid'];
    var client = wwwdude.createClient({headers:headers});
//    sys.debug('headers: ' + sys.inspect(headers));
    client.get(svc.uriLocal+ppath, req.headers)
    .addListener('success', function(data, resp) {
        var newCookie = getCookie(resp.headers);
        if(newCookie != null) 
            req.cookies[host] = {'connect.sid' : newCookie};
//        sys.debug('resp.headers: ' + sys.inspect(resp.headers));
        resp.headers["Access-Control-Allow-Origin"] = "*";
        res.writeHead(200, resp.headers);
//        console.log('writing: ' + data);
        res.end(data);
    })
    .addListener('error', function(err) {
        res.writeHead(500);
        sys.debug("eRr0r :( "+err.toString().trim() + ' ' + svc.uriLocal+ppath);
        res.end("eRr0r :( "+err);
    })
    .addListener('http-error', function(data, resp) {
        res.writeHead(resp.statusCode);
        res.end(data);
    })
    .addListener('redirect', function(data, resp) {
        for (key in resp.headers)
            res.header(key, resp.headers[key]);
        
        var newCookie = getCookie(resp.headers);
        if(newCookie != null)
            req.cookies[host] = {'connect.sid' : newCookie};
        res.redirect(resp.headers['location']);
    });
}

function proxiedPost(svc, ppath, req, res) {
    console.log("proxying post " + req.url + " to "+svc.uriLocal + ppath);
    var host = url.parse(svc.uriLocal).host;
    var cookies;
    if(!req.cookies) {
        req.cookies = {};
    } else {
        cookies = req.cookies[host];
    }
    var headers = req.headers;
    if(cookies && cookies['connect.sid'])
        headers.cookie = 'connect.sid=' + cookies['connect.sid'];
    var client = wwwdude.createClient({headers:headers});
    client.post(svc.uriLocal+ppath, req.rawBody, req.headers)
    .addListener('success', function(data, resp) {
        var newCookie = getCookie(resp.headers);
        if(newCookie != null) 
            req.cookies[host] = {'connect.sid' : newCookie};
        resp.headers["Access-Control-Allow-Origin"] = "*";
        res.writeHead(200, resp.headers);
        console.log('writing: ' + data);
        res.end(data);
    })
    .addListener('error', function(err) {
        res.writeHead(500);
        sys.debug("eRr0r :( "+err.toString().trim() + ' ' + svc.uriLocal+ppath);
        res.end("eRr0r :( "+err);
    })
    .addListener('http-error', function(data, resp) {
        res.writeHead(resp.statusCode);
        res.end(data);
    })
    .addListener('redirect', function(data, resp) {
        for (key in resp.headers)
            res.header(key, resp.headers[key]);
        
        var newCookie = getCookie(resp.headers);
        if(newCookie != null)
            req.cookies[host] = {'connect.sid' : newCookie};
        res.redirect(resp.headers['location']);
    });
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
