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
if (!rootHost || !rootPort) {
    process.stderr.write("missing host and port arguments\n");
    process.exit(1);
}
//var lockerPort = rootPort.substring(1);
var lockerBase = 'http://'+rootHost+':'+lockerPort;

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
app.use(connect.cookieParser());
app.use(connect.session({secret : "locker"}));

var map;
app.get('/', function (req, res) {    
    res.writeHead(200, { 'Content-Type': 'text/html','Access-Control-Allow-Origin' : '*' });
    request.get({uri:lockerBase + '/map'}, function(err, resp, body) {
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
    var config = {'lockerHost':rootHost,
                  'lockerPort':rootPort,
                  'lockerBase':lockerBase};
    res.end('var config = ' + JSON.stringify(config) + ';');
});

// doesn't this exist somewhere? was easier to write than find out, meh!
function intersect(a,b) {
    if(!a || !b) return false;
    for(var i=0;i<a.length;i++)
        for(var j=0;j<b.length;j++)
            if(a[i] == b[j]) return a[i];
    return false;
}

app.get('/post2install', function(req, res){
    var id = parseInt(req.param('id'));
    var js = map.available[id];
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
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write('<a href="/">back</a><br>Installed: '+data);
            res.end();
        });
    });
});


app.get('/*', function (req, res) {
    var uri = url.parse(req.url).pathname;
    var filename = path.join(process.cwd(), uri);  
    path.exists(filename, function(exists) { 
        if(!exists) {  
            res.writeHead(404, {"Content-Type": "text/plain"});  
            res.write("404 Not Found\n");  
            res.end();  
            return;  
        }  

        fs.readFile(filename, "binary", function(err, file) {
            if(err) {
                res.writeHead(500, {"Content-Type": "text/plain"}); 
                res.write(err + "\n");
                res.end();
                return;
            }  

            var fileExtension = filename.substring(filename.lastIndexOf(".") + 1);
            var contentType, contentLength;
            res.writeHead(200);
            res.write(file, "binary");
            res.end();
        });
    });
});

app.listen(rootPort);
