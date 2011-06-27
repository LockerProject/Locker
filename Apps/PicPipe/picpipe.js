/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/


var fs = require('fs'),http = require('http');
var express = require('express'),connect = require('connect');
var app = express.createServer(connect.bodyParser(), connect.cookieParser());
var locker = require('../../Common/node/locker.js');
var lfs = require('../../Common/node/lfs.js');
var lconfig = require('../../Common/node/lconfig.js');
var async = require('async');
var request = require('request');

app.set('views', __dirname);

var photos = [];
var lockerBase;
var flickr;

app.get('/', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(fs.readFileSync(__dirname + '/ui/index.html'));
});

app.get('/2wp', function(req, res) {
    locker.map(function(error,map){
        // find wp
        var wpid;
        for(var id in map.installed)
        {
            if(map.installed[id].srcdir == "Connectors/WordPress")
            {
                wpid = id;
            }
        }
        res.writeHead(200, {'Content-Type': 'text/html'});
        if(!wpid)
        {
            res.end("couldn't find wordpress, go install/connect it? <a href='./'>back</a>");
            return;
        }
        async.forEach(photos,function(photo)
        {
            var file = "../"+flickr+"/originals/"+photo.id+".jpg";
            var url = lockerBase+'/Me/'+wpid+'/uploadFile?file='+file;
            console.error("doing "+url);
            request.get({uri:url});
        });
        res.end("background uploading "+photos.length+" photos to wordpress");
    });
});


app.get('/load', function(req, res) {
    locker.map(function(error,map){
        // find flickr
        var count=0;
        for(var id in map.installed)
        {
            if(map.installed[id].srcdir == "Connectors/Flickr")
            {
                count++;
                flickr = id; // hack hack hack!
                lfs.readObjectsFromFile("../"+id+"/photos.json",function(p){
                    photos = p;
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    if(count>0)
                        res.end("loaded "+photos.length+" flickr photos, for now all you can do is send to <a href='./2wp'>wordpress</a>");
                    else
                        res.end("couldn't find flickr, go install/connect it? <a href='./'>back</a>");
                    return;
                });
            }
        }
    });
});

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    lockerBase = processInfo.lockerUrl;
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    app.listen(processInfo.port,function() {
        var returnedInfo = {};
        console.log(JSON.stringify(returnedInfo));
    });
});

