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

var places = {};
var pcnt = {};
var processInfo;

app.get('/', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(fs.readFileSync(__dirname + '/ui/index.html'));
});

var latlng = "function ll(){}";
app.get('/search', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    var q = req.param("q").toLowerCase();
    res.write("<h2>results for "+q+" on "+Object.keys(places).length+" places</h2>");
    var ids = Object.keys(places).sort(function(a,b){return pcnt[b] - pcnt[a]});
    latlng = "function ll(){";
    var firstp = false;
    for(var i=0; i < ids.length; i++)
    {
        var p = places[ids[i]];
        var txt = p.name + " " + p.location.city + " " + p.location.state;
        if(txt.toLowerCase().indexOf(q) >= 0)
        {
            res.write("<li>("+pcnt[p.id]+") "+txt);
            latlng += 'var marker = new google.maps.Marker({position: new google.maps.LatLng('+p.location.lat+','+p.location.lng+'),map:map,title:"'+txt+'"});'
            firstp = p;
        }
    }
    latlng += 'map.panTo(new google.maps.LatLng('+firstp.location.lat+','+firstp.location.lng+'));}';
    res.end();
});

app.get('/latlng', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/javascript'});
    res.end(latlng);
});


app.get('/load', function(req, res) {
    var type = (req.param('type'))?req.param('type'):"places";
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
            var url = processInfo.lockerUrl+"/Me/"+arr[i].id+"/getCurrent/"+type;
            request.get({uri:url},function(err,res,body){
                if(!err)
                {
                    var p = JSON.parse(body);
                    console.error("got "+p.length+" places from "+url);
                    // need to switch places to {} by id to be unique yet
                    for(var i=0; i < p.length; i++)
                    {
                        var v = (p[i].venue)?p[i].venue:p[i].data.venue;
                        places[v.id] = v;
                    }
                }
            });
        }
        res.end("loaded foursquare places, <a href='./'>back</a>");
    });
});

app.get('/loadEE', function(req, res) {
    locker.providers("checkin/foursquare",function(err, arr){
        res.writeHead(200, {'Content-Type': 'text/html'});
        if(err || arr.length == 0)
        {
            res.end("couldn't find foursquare, go install/connect it? <a href='./'>back</a>");
            return;
        }
        // hack to manually load just for ME!
        lfs.readObjectsFromFile("../"+arr[0].id+"/recent.json",function(p){
            for(var i=0; i < p.length; i++)
            {
                var v = (p[i].venue)?p[i].venue:p[i].data.venue;
                if(!v) continue;
                places[v.id] = v;
                pcnt[v.id] = (!pcnt[v.id])?1:pcnt[v.id]+1;
            }            
        });
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

