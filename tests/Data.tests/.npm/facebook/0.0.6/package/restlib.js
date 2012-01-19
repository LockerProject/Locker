/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/


var fs = require('fs');
var url = require('url');
var express = require('express'),connect = require('connect');
var app = express.createServer(connect.bodyParser());

app.set('views', __dirname);

var fb = require("./lib.js");
fb.init(JSON.parse(fs.readFileSync(process.argv[2])));

for(var f in fb)
{
    if(f == 'init') continue;
    app.get('/'+f,function(req,res){
        var results = [];
        fb[getF(req.url)](req.query,function(item){results.push(item);},function(err){
            if(err)
            {
                res.writeHead(500, {'Content-Type': 'text/plain'});
                res.end(err);
            }else{
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(results));
            }
        });
    });
}

function getF(path)
{
    var q = path.indexOf("?");
    return (q > 0)?path.substr(1,q-1):path.substr(1);
}

app.get('/',function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    try{
        res.end(fs.readFileSync(__dirname + '/ui/index.html'));        
    }catch(e){
        for(var f in fb)
        {
            if(f == 'init') continue;
            res.write("<li><a href='"+f+"'>"+f+"</a>\n")
        }
        res.end();
    }
});

app.listen(8888);