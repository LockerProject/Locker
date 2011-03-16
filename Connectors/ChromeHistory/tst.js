
var fs = require('fs');
var express = require('express'),
    connect = require('connect'),
    lfs = require('../../Common/node/lfs.js'),
    app = express.createServer(
        connect.bodyDecoder(),
        connect.cookieDecoder(),
        connect.session({secret : "locker"}));
        

app.get('/', function(req, res) {
    res.writeHead(200, {
        "Access-Control-Allow-Origin": "*"
    });
    console.log('yep!')
    res.end("hello chrome!!");
});

app.listen(2000);