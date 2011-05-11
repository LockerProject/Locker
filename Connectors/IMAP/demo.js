/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/**
 * Module dependencies.
 */

var port = 3005;

var fs = require('fs'),http = require('http');
var express = require('express'),connect = require('connect');
var app = express.createServer(connect.bodyParser(), connect.cookieParser(), connect.session({secret : "locker"}));
var lfs = require('../../Common/node/lfs.js');

var html = require('../../Common/node/html.js');
var format = function(content) {
    return html.formatHTML("IMAP", content, ["#3B5998", "white", "white", "#7C9494"]); // These colors can be customized later...
};

app.set('views', __dirname);

app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    res.end(format("yeah, hello world, and stuff"));
});

app.get('/get_home_timeline', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    lfs.readObjectsFromFile('demo.json', function(data) {
        data.reverse();
        res.end(format(JSON.stringify(data)));
    });
});

console.log("http://localhost:"+port+"/");
app.listen(port);
