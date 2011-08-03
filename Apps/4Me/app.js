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
var locker = require('locker');
var lfs = require('lfs');
var request = require('request');

app.set('views', __dirname);

var places = [];
var processInfo;

app.get('/', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(fs.readFileSync(__dirname + '/ui/index.html'));
});

app.get('/search', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    var q = req.param("q").toLowerCase();
    res.write("<h2>results for "+q+" on "+places.length+" places</h2>");
    for(var i = 0; i < places.length; i++)
    {
        var p = places[i];
        var txt = p.venue.name + " " + p.venue.location.city + " " + p.venue.location.state;
        if(txt.toLowerCase().indexOf(q) >= 0)
        {
            res.write("<li>"+txt);
        }
    }
    res.end();
});


app.get('/load', function(req, res) {
    locker.providers("checkin/foursquare",function(err, arr){
        res.writeHead(200, {'Content-Type': 'text/html'});
        if(err || arr.length == 0)
        {
            res.end("couldn't find foursquare, go install/connect it? <a href='./'>back</a>");
            return;
        }
        // lazy load these, could use async if we want to know they were loaded before responding
        for(var i=0; i<arr.length; i++)
        {
            var url = processInfo.lockerUrl+"/Me/"+arr[i].id+"/getCurrent/places";
            request.get({uri:url},function(err,res,body){
                if(!err)
                {
                    var p = JSON.parse(body);
                    console.error("got "+p.length+" places from "+url);
                    // need to switch places to {} by id to be unique yet
                    for(var i=0; i < p.length; i++)
                    {
                        places.push(p[i]);
                    }
                }
            });
        }
        res.end("loaded foursquare places, <a href='./'>back</a>");
    });
});

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    app.listen(processInfo.port,function() {
        var returnedInfo = {};
        console.log(JSON.stringify(returnedInfo));
    });
});

