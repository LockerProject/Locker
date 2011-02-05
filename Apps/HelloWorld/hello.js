/**
 * Module dependencies.
 */

var cwd = process.argv[2];
var port = process.argv[3];
if (!cwd || !port) // Z stat dir
{
    process.stderr.write("missing dir and port arguments\n");
    process.exit(1);
}

process.chdir(cwd);

var fs = require('fs'),http = require('http');
var express = require('express'),connect = require('connect');
var app = express.createServer(connect.bodyDecoder(), connect.cookieDecoder(), connect.session({secret : "locker"}));

app.set('views', __dirname);

app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    res.end("yeah, hello world, and stuff");
});

console.log("http://localhost:"+port+"/");
app.listen(port);
