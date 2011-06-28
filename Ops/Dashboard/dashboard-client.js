/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// present a single page listing all the services discovered in this locker, scanning the /Apps /Collections /Contexts and /SourceSinks dirs
// enable start/stop on all (that you can)

var rootHost = process.argv[2];
var lockerPort = process.argv[3];
var rootPort = process.argv[4];
var externalBase = process.argv[5];
var lockerBase = 'http://' + rootHost + ':' + lockerPort + '/core/dashboard';

if (!rootHost || !rootPort) {
    process.stderr.write("missing host and port arguments\n");
    process.exit(1);
}
//var lockerPort = rootPort.substring(1);
var lockerRoot = 'http://'+rootHost+':'+lockerPort;

var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    sys = require('sys'),
    express = require('express'),
    connect = require('connect'),
    http = require('http'),
    request = require('request');
    

var app = express.createServer();
app.use(connect.bodyParser());

var map;
app.get('/', function (req, res) {    
    res.writeHead(200, { 'Content-Type': 'text/html','Access-Control-Allow-Origin' : '*' });
    request.get({uri:lockerRoot + '/map'}, function(err, resp, body) {
        map = JSON.parse(body);
        fs.readFile("dashboard.html", function(err, data) {
            res.write(data, "binary");
            res.end();
        });
    });
});

app.get('/config.js', function (req, res) {    
    res.writeHead(200, { 'Content-Type': 'text/javascript','Access-Control-Allow-Origin' : '*' });
    //this might be a potential script injection attack, just sayin.
    var config = {lockerHost:rootHost,
                  lockerPort:rootPort,
                  lockerBase:lockerRoot,
                  externalBase:externalBase};
    res.end('lconfig = ' + JSON.stringify(config) + ';');
});

// doesn't this exist somewhere? was easier to write than find out, meh!
function intersect(a,b) {
    if(!a || !b) return false;
    for(var i=0;i<a.length;i++)
        for(var j=0;j<b.length;j++)
            if(a[i] == b[j]) return a[i];
    return false;
}

app.get('/install', function(req, res){
    ensureMap(function() {
        install(req, res);
    });
});

function install(req, res) {
    var httpClient = http.createClient(lockerPort);
    var request = httpClient.request('POST', '/core/Dashboard/install', {'Content-Type':'application/json'});
    var item = JSON.stringify(map.available[req.param('id')]);
    request.write(JSON.stringify(map.available[req.param('id')]));
    request.end();
    request.on('response',
    function(response) {
        var data = '';
        response.on('data', function(chunk) {
            data += chunk;
        });
        response.on('end', function() {
            j = JSON.parse(data);
            if(j && j.id) {
                res.writeHead(200, { 'Content-Type': 'application/json','Access-Control-Allow-Origin' : '*'});
                res.end(JSON.stringify({success:j}));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json','Access-Control-Allow-Origin' : '*'});
                res.end(JSON.stringify({error:j}));
            }
        });
    });
}

app.get('/uninstall', function(req, res) {
    stopService('uninstall', req, res);
});

app.get('/enable', function(req, res){
    stopService('enable', req, res);
});


app.get('/disable', function(req, res){
    stopService('disable', req, res);
});

function stopService(method, req, res) {
    var serviceId = req.query.serviceId;
    console.error('doing ' + lockerBase + '/' + method + ' of ' + serviceId);
    request.post({uri:lockerBase + '/' + method, json:{serviceId:serviceId}}, function(err, resp, body) {
        console.error('DEBUG: err', err);
        console.error('DEBUG: body', body);
        if(err) {
            res.writeHead(500, {'Content-Type': 'application/json'});
            console.error(method + ' err', err);
            res.end(JSON.stringify({error:true}));
        } else {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({success:true}));
        }
    });
}

function ensureMap(callback) {
    if (!map || !map.available) {
        request.get({uri:lockerBase + '/map'}, function(err, resp, body) {
            map = JSON.parse(body);
            callback();
        });
    } else {
        process.nextTick(callback);
    }
}


app.use(express.static(__dirname));

app.listen(rootPort);
