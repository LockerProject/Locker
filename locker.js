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
var wwwdude = require('wwwdude'),
    wwwdude_client = wwwdude.createClient({encoding: 'utf-8'});


var lockerHost = process.argv[2]||"localhost";
if(lockerHost != "localhost" && lockerHost != "127.0.0.1") {
    console.log("\nWARNING: if I'm running on a public IP I needs to have password protection, which if so inclined can be hacked into locker.js and added since it's apparently still not implemented :)\n\n"); // uniquely self (de?)referential? lolz!
}
var lockerPort = process.argv[3]||8042;
var lockerBase = "http://"+lockerHost+":"+lockerPort+"/";
var lockerDir = process.cwd();
var map = new Object();
var ats = new Object();

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
connect = require('connect');

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
        'Content-Type': 'text/javascript'
    });
    res.end("true");
    ats[req.param[uri]] = req.param[at];
    var now = new Date().getTime();
    var when = 
    setTimeout(function(){attaboy(req.param[uri]);},(req.param[at]-now)*1000);
    console.log("scheduled "+req.param[uri]+" "+(req.param[at]-now)+" seconds from now");
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
    console.log("proxying to "+svc.uriLocal+" request "+ppath)
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    wwwdude_client.get(svc.uriLocal+ppath)
    .addListener('success', function(data, resp) {
        res.writeHead(200,resp.headers);
        res.end(data);
    })
    .addListener('error', function(err) {
        res.end("eRr0r :( "+err);
    })
    .addListener('http-error', function(data, resp) {
        res.writeHead(resp.statusCode);
        res.end(data);
    })
    .addListener('redirect', function(data, resp) {
        res.redirect(resp.headers['location']);
    })
    .send();
}


locker.listen(lockerPort);
console.log('locker running at ' + lockerBase);


function spawnMe(svc, callback) {
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
        console.log('STDOUT from ' + svc.id + ': '+ data);
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

// our hackney scheduler
function attaboy(uri)
{
    var now = new Date().getTime();
    // temporal displacement?
    if(!ats[uri] || abs(ats[uri] - now) > 10) return;
    console.log("attaboy running "+uri);
    wwwdude_client.get(uri).send();
}
