/* random notes:
on startup scan all folders
    Apps Collections Contexts SourceSinks - generate lists of "available"
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

var dashHost = process.argv[2]||"localhost";
var dashPort = process.argv[3]||8042;
var lockerPort = parseInt('1'+dashPort);
var map = new Object();

mapDir('Contexts');
mapDir('Connectors');
mapDir('Collections');
mapDir('Apps');

// start our internal service
var express = require('express'),
connect = require('connect');

locker = express.createServer(
connect.bodyDecoder(),
connect.cookieDecoder(),
connect.session()
);

// start dashboard
dashboard  = spawn('node', ['Ops/Dashboard/dashboard.js', dashHost, dashPort]);
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
        'Content-Type': 'text/html'
    });
    res.end("Why hello there, pleased to meet you, I'm the locker service.");
});

locker.get('/available',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    res.end("{}");
});

locker.get('/install',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    res.end("{}");
});

locker.get('/existing',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    res.end("{}");
});

locker.get('/connect',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    res.end("{}");
});

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
        if(/\.context$/.test(fullPath)) mapContext(fullPath);
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
function mapContext(file)
{
    var js = JSON.parse(fs.readFileSync(file, 'utf-8'));
    js.srcdir = path.dirname(file);
    js.is = "context";
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
    if(!obj[key]) obj[key] = new Array();
    obj[key].push(item);
}