/* random notes:
on startup scan all folders
    Apps Collections Connectors - generate lists of "available"
    Me/* - generate lists of "existing"

when asked, run any existing and return localhost:port
if first time
    check dependencies
    create Me/ dir
    create me.json settings
    pick a port
*/

require.paths.push(__dirname + "/Common/node");
var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
//var crypto = require('crypto');
var url = require("url");
var sys = require('sys');
var lconsole = require("lconsole");
var http = require('http');
var wwwdude = require('wwwdude'),
    wwwdude_client = wwwdude.createClient({encoding: 'utf-8'});
var lscheduler = require("lscheduler");
var serviceManager = require("lservicemanager");

var lockerHost = process.argv[2]||"localhost";
if(lockerHost != "localhost" && lockerHost != "127.0.0.1") {
    console.warn('if I\'m running on a public IP I needs to have password protection,' + // uniquely self (de?)referential? lolz!
                'which if so inclined can be hacked into locker.js and added since it\'s apparently still not implemented :)\n\n');
}
var lockerPort = process.argv[3]||8042;
var lockerBase = "http://"+lockerHost+":"+lockerPort+"/";
var lockerDir = process.cwd();
var map = new Object(); // all services and their metadata
var ats = new Object(); // scheduled calls
var listeners = new Object(); // listeners for events
var shuttingDown_ = false;
var scheduler = new lscheduler.Scheduler;

// load up private key or create if none, just KISS for now
var idKey,idKeyPub;
function loadKeys()
{
    idKey = fs.readFileSync('Me/key','utf-8');
    idKeyPub = fs.readFileSync('Me/key.pub','utf-8');
    console.log("id keys loaded");
}
path.exists('Me/key',function(exists){
    if(exists)
    {
        loadKeys();
    }else{
        openssl = spawn('openssl', ['genrsa', '-out', 'key', '1024'], {cwd: 'Me'});
        console.log('generating id private key');
//        openssl.stdout.on('data',function (data){console.log(data);});
//        openssl.stderr.on('data',function (data){console.log('Error:'+data);});
        openssl.on('exit', function (code) {
            console.log('generating id public key');
            openssl = spawn('openssl', ['rsa', '-pubout', '-in', 'key', '-out', 'key.pub'], {cwd: 'Me'});
            openssl.on('exit', function (code) {
                loadKeys();
            });
        });
    }
});

// look for available things
serviceManager.scanDirectory("Connectors");
serviceManager.scanDirectory("Collections");
serviceManager.scanDirectory("Apps");

// look for existing things
serviceManager.findInstalled();

var scheduler = new lscheduler.Scheduler;
scheduler.loadAndStart();

// start our internal service
var express = require('express'),
    connect = require('connect'),
    locker = express.createServer(
        connect.bodyDecoder(),
        connect.cookieDecoder(),
        connect.session({secret : "locker"})
    );

// start dashboard
var lockerPortNext = "1"+lockerPort;
dashboard  = spawn('node', ['dashboard.js', "localhost", lockerPortNext], {cwd: 'Ops/Dashboard'});
dashboard.uriLocal = "http://localhost:"+lockerPortNext+"/";
lockerPortNext++;
console.log('Spawned dashboard pid: ' + dashboard.pid);
dashboard.stdout.on('data',function (data){
console.log('dashboard stdout: '+data);
});
dashboard.stderr.on('data',function (data){
    console.log('Error dashboard: '+data);
});
dashboard.on('exit', function (code) {
  if(code > 0) console.log('dashboard died with code ' + code);
});

// return the known map of our world
locker.get('/map',
function(req, res) {
    console.log('/map');
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    res.end(JSON.stringify(serviceManager.serviceMap()));
});

// let any service schedule to be called, it can only have one per uri
locker.get('/at',
function(req, res) {
    console.log('/at');
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var seconds = req.param("at");
    var svcId = req.param('id'), cb = req.param('cb');
    if (!seconds || !svcId || !cb) {
        res.writeHead(400);
        res.end("Invalid arguments");
        return;
    }
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
    console.log(req.uri);
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
    console.log(req.uri);
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

// anybody can listen into any service's events
locker.get('/listen',
function(req, res) {
    console.log(req.uri);
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
    console.log(req.uri);
    var id = req.param('id'), type = req.param('type');
    res.writeHead(200);
    res.end();
    console.log("new event from "+id+" "+type);
    var list = listeners[id+'='+type];
    if(!list || list.length == 0) return;
    for(var i in list)
    {
        var to = list[i].substr(0,32);
        var path = list[i].substr(32);
        console.log("publishing new event to "+id+" at "+path);
        if(!serviceManager.isInstalled(id)) continue;
        if(!serviceManager.isRunning(id)) continue; // start up?? probably?
        var uri = uri.parse(serviceManager.metaInfo(id).uriLocal);
        // cuz http client is dumb and doesn't work on localhost w/ no dns?!?! srsly
        if(uri.host == "localhost" || uri.host == "127.0.0.1")
        {
            var httpClient = http.createClient(uri.port);            
        }else{
            var httpClient = http.createClient(uri.port,uri.host);            
        }
        var request = httpClient.request('POST', path, {'Content-Type':'application/x-www-form-urlencoded'});
        request.write(req.rawBody);
        // !!!! need to catch errors and remove this from the list
        request.end();
    }
});

// fallback everything to the dashboard
locker.get('/*',
function(req, res) {
    console.log(req.uri);
    proxied(dashboard,req.url.substring(1),req,res);
});

// fallback everything to the dashboard
locker.post('/*',
function(req, res) {
    console.log(req.uri);
    proxiedPost(dashboard,req.url.substring(1),req,res);
});

locker.get('/',
function(req, res) {
    console.log(req.uri);
    proxied(dashboard,"",req,res);
});


function proxied(svc, ppath, req, res) {
    console.log("proxying " + req.url + " to "+svc.uriLocal + ppath);
    var host = url.parse(svc.uriLocal).host;
    var cookies;
    if(!req.session.cookies) {
        req.session.cookies = {};
    } else {
        cookies = req.session.cookies[host];
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
            req.session.cookies[host] = {'connect.sid' : newCookie};
//        sys.debug('resp.headers: ' + sys.inspect(resp.headers));
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
            req.session.cookies[host] = {'connect.sid' : newCookie};
        res.redirect(resp.headers['location']);
    });
}

function proxiedPost(svc, ppath, req, res) {
    console.log("proxying post " + req.url + " to "+svc.uriLocal + ppath);
    var host = url.parse(svc.uriLocal).host;
    var cookies;
    if(!req.session.cookies) {
        req.session.cookies = {};
    } else {
        cookies = req.session.cookies[host];
    }
    var headers = req.headers;
    if(cookies && cookies['connect.sid'])
        headers.cookie = 'connect.sid=' + cookies['connect.sid'];
    var client = wwwdude.createClient({headers:headers});
    client.post(svc.uriLocal+ppath, req.rawBody, req.headers)
    .addListener('success', function(data, resp) {
        var newCookie = getCookie(resp.headers);
        if(newCookie != null) 
            req.session.cookies[host] = {'connect.sid' : newCookie};
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
            req.session.cookies[host] = {'connect.sid' : newCookie};
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

locker.listen(lockerPort);
console.log('locker running at ' + lockerBase);

// make sure the value of the key is an array and insert the item
function insertSafe(obj,key,item) {
    console.log("inserting into "+key+": "+JSON.stringify(item))
    if(!obj[key]) obj[key] = new Array();
    obj[key].push(item);
}

process.on("SIGINT", function() {
    process.stdout.write("\n");
    shuttingDown_ = true;
    serviceManager.shutdown(function() {
        console.log("Shutdown complete.");
        process.exit(0);
    });
});

