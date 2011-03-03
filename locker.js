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
var crypto = require('crypto');
var url = require("url");
var sys = require('sys');
var lconsole = require("lconsole");
var http = require('http');
var wwwdude = require('wwwdude'),
    wwwdude_client = wwwdude.createClient({encoding: 'utf-8'});


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
mapDir('Connectors');
mapDir('Collections');
mapDir('Apps');

// look for existing things
var dirs = fs.readdirSync('Me');
for (var i = 0; i < dirs.length; i++) {
    var dir =  'Me/' + dirs[i];
    if(!fs.statSync(dir).isDirectory()) continue;
    if(!fs.statSync(dir+'/me.json').isFile()) continue;
    var js = JSON.parse(fs.readFileSync(dir+'/me.json', 'utf-8'));
    map[js.id] = js;
    insertSafe(map,"existing",js.id);
}

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
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    res.end(JSON.stringify(map));
});

// let any service schedule to be called, it can only have one per uri
locker.get('/at',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var uri = req.param('uri'), at = req.param('at');
    ats[uri] = at;
    var now = new Date().getTime();
    var when = 
    setTimeout(function(){attaboy(uri);},at-now);
    console.log("scheduled "+ uri +" "+ (at - now)/1000 +" seconds from now");
    res.end("true");
});

// given a bunch of json describing a service, make a home for it on disk and add it to our map
locker.post('/install',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    console.log("installing "+req.rawBody);
    var js = JSON.parse(req.rawBody);
    var hash = crypto.createHash('md5');
    hash.update(Math.random());
    js.id = hash.digest('hex');
    js.me = lockerDir+'/Me/'+js.id;
    js.uri = lockerBase+"Me/"+js.id+"/";
    map[js.id] = js;
    insertSafe(map,"existing",js.id);
    fs.mkdirSync(js.me,0755);
    fs.writeFileSync(js.me+'/me.json',JSON.stringify(js));
    res.end(JSON.stringify(js));
});

// all of the requests to something installed (proxy them, moar future-safe)
locker.get('/Me/*', function(req,res){
    var id = req.url.substring(4,36);
    var ppath = req.url.substring(37);
    if(!map[id]) { // make sure it exists before it can be opened
        res.writeHead(404);
        res.end("so sad, couldn't find "+id);
        return;
    }
    if(!map[id].pid) { // spawn if it hasn't been
        spawnService(map[id],function(){
            proxied(map[id],ppath,req,res);
        });
    } else {
        proxied(map[id],ppath,req,res);
    }
});

// anybody can listen into any service's events
locker.get('/listen',
function(req, res) {
    var id = req.param('id'), type = req.param('type'), cb = req.param('cb'), from = req.param('from');
    if(!map[id] || !map[from]) {
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
        if(!map[id]) continue;
        if(!map[id].pid) continue; // start up?? probably?
        var uri = uri.parse(map[id].uriLocal);
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
    proxied(dashboard,req.url.substring(1),req,res);
});

locker.get('/',
function(req, res) {
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
    client.get(svc.uriLocal+ppath, req.headers)
    .addListener('success', function(data, resp) {
        var newCookie = getCookie(resp.headers);
        if(newCookie != null) 
            req.session.cookies[host] = {'connect.sid' : newCookie};
        res.writeHead(200, {
                "Access-Control-Allow-Origin": "*"
            });
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

function checkForShutdown() {
    if (!shuttingDown_) return;
    for(var mapEntry in map) {
        var svc = map[mapEntry];
        if (svc.pid)  return;
    }
    process.exit(0);
}

//! Spawn a service instance
/**
* \param svc The service description to start
* \param callback Completion callback
*
* The service will be spanwed as described in its configuration file.  The service can
* read its environment description from stdin which will consist of one JSON object.  The
* object will have a mandatory port and workingDirectory field, but the rest is optional.
* \code
*   {
*     port:18044,
*     workingDirectory:"/some/path/"
*   }
* \endcode
* Once the service has completed its startup it will write out to stdout a single JSON object
* with the used port and any other environment information.  The port must be the actual
* port the service is listening on.
* \code
*   {
*     port:18044
*   }
* \encode
*/
function spawnService(svc, callback) {
    var run = svc.run.split(" "); // node foo.js

    var processInformation = {
        port: ++lockerPortNext, // This is just a suggested port
        workingDirectory: svc.me, // A path into the me directory
    };
    app = spawn(run.shift(), run, {cwd: svc.srcdir});
    app.stderr.on('data', function (data) {
        var mod = console.outputModule
        console.outputModule = svc.title
        console.error(data);
        console.outputModule = mod
    });
    app.stdout.on('data',function (data) {
        var mod = console.outputModule
        console.outputModule = svc.title
        if (svc.pid) {
            // We're already running so just log it for them
            console.log(data);
        } else {
            // Process the startup json info
            try {
                var returnedProcessInformation = JSON.parse(data);

                console.log(svc.title + " is now running.");
                svc.pid = app.pid;
                svc.port = returnedProcessInformation.port;
                svc.uriLocal = "http://localhost:"+svc.port+"/";
                fs.writeFileSync(svc.me+'/me.json',JSON.stringify(svc)); // save out all updated meta fields
                if (callback) callback();
            } catch(error) {
                console.error("The process did not return valid startup information.");
                app.kill();
            }
        }
        console.outputModule = mod;
        
    });
    app.on('exit', function (code) {
        console.log('exited with code ' + code);
        delete svc.pid;
        fs.writeFileSync(svc.me+'/me.json',JSON.stringify(svc)); // save out all updated meta fields
        checkForShutdown();
    });
    app.stdin.write(JSON.stringify(processInformation)+"\n"); // Send them the process information
    console.log('Spawning app ' + svc.title + " with id " + svc.id + ', pid: ' + app.pid +' at ' + svc.uri);
}

// scan to load local map of stuff
function mapDir(dir) {
    var files = fs.readdirSync(dir);
    for (var i = 0; i < files.length; i++) {
        var fullPath = dir + '/' + files[i];
        var stats = fs.statSync(fullPath);
        if(stats.isDirectory()) {
            mapDir(fullPath);
            continue;
        }
        if(/\.collection$/.test(fullPath)) mapCollection(fullPath);
        if(/\.connector$/.test(fullPath)) mapConnector(fullPath);
        if(/\.app$/.test(fullPath)) mapApp(fullPath);
    }
}

function mapCollection(file) {
    var js = JSON.parse(fs.readFileSync(file, 'utf-8'));
    js.srcdir = path.dirname(file);
    js.is = "collection";
    insertSafe(map,"available",js);
}
function mapConnector(file) {
    var js = JSON.parse(fs.readFileSync(file, 'utf-8'));
    js.srcdir = path.dirname(file);
    js.is = "connector";
    insertSafe(map,"available",js);
}
function mapApp(file) {
    var js = JSON.parse(fs.readFileSync(file, 'utf-8'));
    js.srcdir = path.dirname(file);
    js.is = "app";
    insertSafe(map,"available",js);
}

// make sure the value of the key is an array and insert the item
function insertSafe(obj,key,item) {
    console.log("inserting into "+key+": "+JSON.stringify(item))
    if(!obj[key]) obj[key] = new Array();
    obj[key].push(item);
}
//
// our hackney scheduler
function attaboy(uri) {
    var now = new Date().getTime();
    // temporal displacement?
    if(!ats[uri] || Math.abs(ats[uri] - now) > 10) return;
    console.log("attaboy running "+uri);
    wwwdude_client.get(uri);
}

process.on("SIGINT", function() {
    shuttingDown_ = true;
    console.log("Starting shutdown...");
    for(var mapEntry in map) {
        var svc = map[mapEntry];
        console.log("Checking " + svc.title + "...");
        if (svc.pid) {
            console.log("Ending " + svc.title);
            try {
                process.kill(svc.pid);
            } catch(e) {
            }
        }
    }
    checkForShutdown();
});

