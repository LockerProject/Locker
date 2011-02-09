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

var dashHost = process.argv[2]||"localhost";
if(dashHost != "localhost" || dashHost != "127.0.0.1")
{
    console.log("WARNING: if you're running this on a public IP it needs to have password protection, which you can hack locker.js and add since it's apparently still not implemented :)"); // uniquely self (de?)referential? lolz!
}
var dashPort = process.argv[3]||8042;
var dashBase = "http://"+dashHost+":"+dashPort+"/";
var lockerPort = parseInt('1'+dashPort);
var lockerDir = process.cwd();
var map = new Object();

// look for available things
mapDir('Connectors');
mapDir('Collections');
mapDir('Apps');

// look for existing things
var dirs = fs.readdirSync('Me');
for (var i = 0; i < dirs.length; i++)
{
    var dir =  'Me/' + dirs[i];
    if(!fs.statSync(dir).isDirectory()) continue;
    if(!fs.statSync(dir+'/me.json').isFile()) continue;
    var js = JSON.parse(fs.readFileSync(dir+'/me.json', 'utf-8'));
    map[js.id] = js;
    insertSafe(map,"existing",js);
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
dashboard  = spawn('node', ['dashboard.js', dashHost, dashPort], {cwd: 'Ops/Dashboard'});
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

locker.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin' : '*'
    });
    res.end("Why hello there, pleased to meet you, I'm the locker service.");
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

locker.get('/open',
function(req, res) {
    var id = req.param('id');
    if(!map[id]) // make sure it exists before it can be opened
    {
        res.writeHead(404);
        res.end();
        return;
    }
    if(!map[id].pid) // spawn if it hasn't been
    {
        spawnMe(map[id],function(){
            opened(map[id],res);
        });
    }else{
        opened(map[id],res);
    }
});

function opened(svc, res)
{
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    res.end(JSON.stringify(svc)); // will contain conn URI
    
}


locker.listen(lockerPort);
console.log('locker running at http://localhost:' + lockerPort + '/');


//the least intelligent way of avoiding port conflicts
var appPortCounter = 4000;
function spawnMe(svc, callback) {
    appPortCounter++;
    var run = svc.run.split(" "); // node foo.js
    run.push(svc.me); // pass in it's working directory
    run.push(appPortCounter); // pass in it's assigned port
    console.log(run);
    svc.port = appPortCounter;
    svc.uri = "http://localhost:"+svc.port+"/";
    svc.proxied = {};
    for(var p in svc.proxy)
    {
        var orig = dashBase+p;
        var dest = svc.uri+svc.proxy[p];
        console.log("proxying /"+orig+" to "+dest);
        svc.proxied[svc.proxy[p]] = orig;
        locker.get(p, function(req, res) {
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            wwwdude_client.get(dest)
            .addListener('success', function(data, resp) {
                res.write(data);
                res.end();
            }).send();
        });
    }
    fs.writeFileSync(svc.me+'/me.json',JSON.stringify(svc)); // save out all updated meta fields
    app = spawn(run.shift(), run, {cwd: svc.srcdir});
    svc.pid = app.pid;
    console.log('Spawned app ' + svc.id + ', pid: ' + app.pid +' at ' + svc.uri);
    app.stderr.on('data',function (data){
        svc.error = data;
        console.log('Error in app ' + svc.id + ': '+data);
    });
    app.stdout.on('data',function (data){
        console.log('Started ' + svc.id + ' at: '+ data);
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
        if(stats.isDirectory())
        {
            mapDir(fullPath);
            continue;
        }
        if(/\.collection$/.test(fullPath)) mapCollection(fullPath);
        if(/\.connector$/.test(fullPath)) mapConnector(fullPath);
        if(/\.app$/.test(fullPath)) mapApp(fullPath);
    }
}

function mapCollection(file)
{
    var js = JSON.parse(fs.readFileSync(file, 'utf-8'));
    js.srcdir = path.dirname(file);
    js.is = "collection";
    insertSafe(map,"available",js);
    insertSafe(map,js.type,js);
}
function mapConnector(file)
{
    var js = JSON.parse(fs.readFileSync(file, 'utf-8'));
    js.srcdir = path.dirname(file);
    js.is = "connector";
    insertSafe(map,"available",js);
    insertSafe(map,js.type,js);
}
function mapApp(file)
{
    var js = JSON.parse(fs.readFileSync(file, 'utf-8'));
    js.srcdir = path.dirname(file);
    js.is = "app";
    insertSafe(map,"available",js);
    if(js.type) insertSafe(map,js.type,js);
}

// make sure the value of the key is an array and insert the item
function insertSafe(obj,key,item)
{
    console.log("inserting into "+key+": "+JSON.stringify(item))
    if(!obj[key]) obj[key] = new Array();
    obj[key].push(item);
}