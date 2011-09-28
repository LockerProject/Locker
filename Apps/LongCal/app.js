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
app.use(express.static(__dirname + '/static'));

var processInfo;
var csv = "";

app.get('/csv', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(csv);
});

function long2num(l)
{
    l += 130;
    l = l/10;
    l = l/(5.6/8);
    if(l <= 1) l = 1;
    if(l >= 8) l = 8;
    return l;
}

Date.prototype.yyyymmdd = function() {
   var yyyy = this.getFullYear().toString();
   var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based
   var dd  = this.getDate().toString();
   return yyyy + "-" + (mm[1]?mm:"0"+mm[0]) + "-" + (dd[1]?dd:"0"+dd[0]); // padding
  };

function loadPlaces(cb){
    request.get({uri:locker.lockerBase+"/Me/places/getPlaces?me=true",json:true},function(err,res,body){
        if(err || !body) return cb();
        var places = [];
        body.forEach(function(p){places.push({at:p.at, c:long2num(p.lng)})});
        places = places.sort(function(a,b){return (a.at - b.at)});
        csvBuild(places);
        cb();
    });
};

function csvBuild(places)
{
    var now = new Date().getTime();
    var last = Math.round(places.shift().c);
    csv = "Date,Color\n";
    for(var i = 1262333360000; i < now; i += 43200000)
    {
        var a = [last]; // use last one to average or set next
        while(places.length > 0 && places[0].at < i) a.push(places.shift().c);
        if(a.length == 1 && places.length > 0) a.push(places[0].c); // average closer to the next one
        var sum=0;
        for(var j=0;j<a.length;j++) sum += a[j];
        last = Math.round(sum/a.length);
        var d = new Date(i);
        csv += d.yyyymmdd();
        csv += "," + last;
        csv += "\n";
    }
}

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    loadPlaces(function(){
        app.listen(processInfo.port,function() {
            var returnedInfo = {};
            console.log(JSON.stringify(returnedInfo));
        });        
    });
});

