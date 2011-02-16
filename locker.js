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

var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var url = require("url");
var sys = require('sys');
var wwwdude = require('wwwdude'),
    wwwdude_client = wwwdude.createClient({encoding: 'utf-8'});


var lockerHost = process.argv[2]||"localhost";
if(lockerHost != "localhost" || lockerHost != "127.0.0.1") {
    console.log('\nWARNING: if I\'m running on a public IP I needs to have password protection,' + // uniquely self (de?)referential? lolz!
                'which if so inclined can be hacked into locker.js and added since it\'s apparently still not implemented :)\n\n'); 
}
var lockerPort = process.argv[3]||8042;
var lockerBase = "http://"+lockerHost+":"+lockerPort+"/";
var lockerDir = process.cwd();
var map = new Object();

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
    insertSafe(map,"existing",js);
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
    console.log('Contact dashboard at: '+data);
});
dashboard.stderr.on('data',function (data){
    console.log('Error dashboard: '+data);
});
dashboard.on('exit', function (code) {
  if(code > 0) console.log('dashboard died with code ' + code);
});


locker.get('/map',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    res.end(JSON.stringify(map));
});

locker.get('/available',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    res.end(JSON.stringify(map.available));
});

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
    insertSafe(map,"existing",js);
    fs.mkdirSync(js.me,0755);
    fs.writeFileSync(js.me+'/me.json',JSON.stringify(js));
    res.end(JSON.stringify(js));
});

locker.get('/existing',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    res.end(JSON.stringify(map.existing));
});

locker.get('/Me/*', function(req,res){
    var id = req.url.substring(4,36);
    var ppath = req.url.substring(37);
    if(!map[id]) { // make sure it exists before it can be opened
        res.writeHead(404);
        res.end("so sad, couldn't find "+id);
        return;
    }
    if(!map[id].pid) { // spawn if it hasn't been
        spawnMe(map[id],function(){
            proxied(map[id],ppath,req,res);
        });
    } else {
        proxied(map[id],ppath,req,res);
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
        res.writeHead(200);
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
    })
    .send();
}

function getCookie(headers) {
    var cookies = {};
    if(headers && headers['set-cookie']) {
        var splitCookies = headers['set-cookie'].split(';');
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


function spawnMe(svc, callback) {
    console.log('spawnMe');
    lockerPortNext++; //the least intelligent way of avoiding port conflicts
    var run = svc.run.split(" "); // node foo.js
    run.push(svc.me); // pass in it's working directory
    run.push(lockerPortNext); // pass in it's assigned port
    console.log(run);
    svc.port = lockerPortNext;
    svc.uriLocal = "http://localhost:"+svc.port+"/";
    fs.writeFileSync(svc.me+'/me.json',JSON.stringify(svc)); // save out all updated meta fields
    app = spawn(run.shift(), run, {cwd: svc.srcdir});
    svc.pid = app.pid;
    console.log('Spawned app ' + svc.id + ', pid: ' + app.pid +' at ' + svc.uri);
    app.stderr.on('data',function (data){
        svc.error = data;
        console.log('Error in app ' + svc.id + ': '+data);
    });
    app.stdout.on('data',function (data){
        console.log('recieved from ' + svc.id + ': '+ data);
        callback();
    });
    app.on('exit', function (code) {
      console.log('exited with code ' + code);
      delete svc.pid;
    });
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
    insertSafe(map,js.type,js);
}
function mapConnector(file) {
    var js = JSON.parse(fs.readFileSync(file, 'utf-8'));
    js.srcdir = path.dirname(file);
    js.is = "connector";
    insertSafe(map,"available",js);
    insertSafe(map,js.type,js);
}
function mapApp(file) {
    var js = JSON.parse(fs.readFileSync(file, 'utf-8'));
    js.srcdir = path.dirname(file);
    js.is = "app";
    insertSafe(map,"available",js);
    if(js.type) insertSafe(map,js.type,js);
}

// make sure the value of the key is an array and insert the item
function insertSafe(obj,key,item) {
    console.log("inserting into "+key+": "+JSON.stringify(item))
    if(!obj[key]) obj[key] = new Array();
    obj[key].push(item);
}