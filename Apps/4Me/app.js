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
var async = require('async');

app.set('views', __dirname);

var processInfo;
var myCheckins = [];
var myFriends = [];

app.get('/', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(fs.readFileSync(__dirname + '/ui/index.html'));
});

var latlng = "function ll(){}";
app.get('/search', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    var q = req.param("q").toLowerCase();
    var friends = req.param("friends");
    var places = myCheckins;
    if(friends)
    {
        for(var i=0;i<myFriends.length;i++) places.push(myFriends[i]);
    }
    var firstp = false;
    var ids = {};
    for(var i=0; i < places.length; i++)
    {
        p = places[i];
        if(ids[p.venue.id]) continue;
        if(p.search.toLowerCase().indexOf(q) >= 0)
        {
            ids[p.venue.id]=true;
            if(!firstp)
            {
                firstp = p;
                res.write('var bounds = new google.maps.LatLngBounds();');
                res.write('map = new google.maps.Map(document.getElementById("map_canvas"), {center:new google.maps.LatLng('+firstp.venue.location.lat+','+firstp.venue.location.lng+'),zoom:9,mapTypeId: google.maps.MapTypeId.ROADMAP});')
            }else{
                if (p.venue.hasOwnProperty('categories') && p.venue.categories.length > 0 && p.venue.categories[0].hasOwnProperty('icon'))
                {
                res.write('add_marker(' + p.venue.location.lat + ',' + p.venue.location.lng + ',"' + p.venue.categories[0].icon + '",' + '"<h1>' + p.venue.name + '</h1>"' + ', false);')
                }else{
                res.write('add_marker(' + p.venue.location.lat + ',' + p.venue.location.lng + ', false,' + '"' + p.venue.name + '"' + ', false);')
                }
                res.write('bounds.extend(new google.maps.LatLng('+p.venue.location.lat+','+p.venue.location.lng+'));');
            }
        }
    }
    if(firstp) res.write('map.fitBounds(bounds);');
    res.end();
});

app.get('/latlng', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/javascript'});
    res.end(latlng);
});


function load4(type,cb){
    locker.providers("checkin/foursquare",function(err, arr){
        var places = [];
        if(err || arr.length == 0) return cb(places);
        async.forEach(arr,function(svc,cb){
            var url = processInfo.lockerUrl+"/Me/"+svc.id+"/getCurrent/"+type;
            request.get({uri:url},function(err,res,body){
                if(!err)
                {
                    var p = JSON.parse(body);
                    console.error("got "+p.length+" places from "+url);
                    // need to switch places to {} by id to be unique yet
                    for(var i=0; i < p.length; i++)
                    {
                        // normalize it a bit and make a search string
                        
                        if (p[i].type != "venueless")
                        {
                            if(p[i].data && p[i].data.venue) p[i].venue = p[i].data.venue;
                            p[i].search =  p[i].venue.name + " " + p[i].venue.location.city + " " + p[i].venue.location.state;
                            places.push(p[i]);
                        }
                    }
                }
                cb();
            });
        },function(){cb(places)});
    });
};

function disk4_tmp()
{
    locker.providers("checkin/foursquare",function(err, arr){
        if(err || arr.length == 0) return;
        // hack to manually load just for ME!
        lfs.readObjectsFromFile("../"+arr[0].id+"/recent.json",function(p){
            console.error("got "+p.length+" friend places");
            for(var i=0; i < p.length; i++)
            {
                // normalize it a bit and make a search string
                if(p[i].data && p[i].data.venue){
                    p[i].venue = p[i].data.venue;
                    p[i].user = p[i].data.user;
                }
                if(!p[i].venue) continue;
                p[i].search =  p[i].user.firstName + " " + p[i].user.lastName + " - " + p[i].venue.name + " " + p[i].venue.location.city + " " + p[i].venue.location.state;
                myFriends.push(p[i]);
            }            
        });
    });
}

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    load4("places",function(p){myCheckins = p});
    disk4_tmp(); // temp hack to get manually from disk
    app.listen(processInfo.port,function() {
        var returnedInfo = {};
        console.log(JSON.stringify(returnedInfo));
    });
});

