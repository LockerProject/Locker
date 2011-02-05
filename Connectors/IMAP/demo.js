/**
 * Module dependencies.
 */

var port = 3005;

var fs = require('fs'),http = require('http');
var express = require('express'),connect = require('connect');
var app = express.createServer(connect.bodyDecoder(), connect.cookieDecoder(), connect.session({secret : "locker"}));
var lfs = require('../../Common/node/lfs.js');


app.set('views', __dirname);

app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    res.end("yeah, hello world, and stuff");
});

app.get('/get_home_timeline', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    lfs.readObjectsFromFile('demo.json', function(data) {
        data.reverse();
        res.write(JSON.stringify(data));
        res.end();
    });
});

console.log("http://localhost:"+port+"/");
app.listen(port);
