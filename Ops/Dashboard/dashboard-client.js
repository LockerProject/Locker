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
var rootPort = process.argv[3];
if (!rootHost || !rootPort)
 {
    process.stderr.write("missing host and port arguments\n");
    process.exit(1);
}
var lockerPort = rootPort.substring(1);
var lockerBase = 'http://'+rootHost+':'+lockerPort;

var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    sys = require('sys'),
    express = require('express'),
    connect = require('connect'),
    http = require('http'),
    wwwdude = require('wwwdude'),
    wwwdude_client = wwwdude.createClient({
        encoding: 'utf-8'
    });
    
var app = express.createServer();
app.use(connect.bodyParser());
app.use(connect.cookieParser());
app.use(connect.session({secret : "locker"}));

var map;
app.get('/', function (req, res) {    
    res.writeHead(200, { 'Content-Type': 'text/html','Access-Control-Allow-Origin' : '*' });
    wwwdude_client.get(lockerBase + '/map').addListener('success', function(data, resp) {
        map = JSON.parse(data);
        fs.readFile("dashboard.html", function(err, data) {
            res.write(data, "binary");
            res.end();
        });
    });
});

// doesn't this exist somewhere? was easier to write than find out, meh!
function intersect(a,b)
{
    if(!a || !b) return false;
    for(var i=0;i<a.length;i++)
    {
        for(var j=0;j<b.length;j++)
        {
            if(a[i] == b[j]) return a[i];
        }
    }
    return false;
}

app.get('/post2install', function(req, res){
    var id = parseInt(req.param('id'));
    var js = map.available[id];
    var httpClient = http.createClient(lockerPort);
    var request = httpClient.request('POST', '/install', {'Content-Type':'application/json'});
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

            switch (fileExtension)
            {
              case "png": contentType = "image/png";  break;
              case "jpg": contentType = "image/jpeg"; break;
              case "gif": contentType = "image/gif";  break;
            }

            if (contentType)
            {
              res.writeHead(200, { "Content-Type": contentType });
              res.write(file, "binary");
            }
            else
            {
              res.writeHead(200);
              res.write(file, "binary");
            }
            res.end();
        });
    });
});

app.listen(rootPort);
