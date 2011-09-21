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
    request.get({uri:"http://localhost:8042/Me/places/getPlaces?me=true",json:true},function(err,res,body){
        if(err || !body) return cb();
        csv = "Date,Color\n";
        body.forEach(function(p){
            var d = new Date(p.at);
            csv += d.yyyymmdd();
            csv += "," + Math.round(long2num(p.lng));
            csv += "\n";
        });
        cb();
    });
};

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

