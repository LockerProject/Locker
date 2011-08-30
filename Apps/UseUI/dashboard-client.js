/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// Present a single page listing all the services discovered in this locker, scanning the
// /Apps /Collections /Contexts and /SourceSinks dirs
// enable start/stop on all (that you can)

var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    sys = require('sys'),
    express = require('express'),
    connect = require('connect'),
    http = require('http'),
    request = require('request');
    

var map;

var rootHost;
var lockerPort;
var rootPort;
var externalBase;
var lockerBase;
var lockerRoot;

module.exports = function(passedLockerHost, passedLockerPort, passedPort, passedExternalBase) {
    rootHost = passedLockerHost;
    lockerPort = passedLockerPort;
    rootPort = passedPort;
    externalBase = passedExternalBase;
    lockerBase = 'http://' + rootHost + ':' + lockerPort + '/core/dashboard';
    lockerRoot = 'http://'+rootHost+':'+lockerPort;
    
    app.use(express.static(__dirname + '/static'));

    app.listen(rootPort);
}

var app = express.createServer();
app.use(connect.bodyParser());

app.get('/apps', function(req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    var apps = {contacts: {url : lockerRoot + '/Me/contactsviewer/', id : 'contactsviewer'},
                photos: {url : lockerRoot + '/Me/hellophotos/', id : 'hellophotos'},
                links: {url : lockerRoot + '/Me/hellolinks/', id : 'hellolinks'},
                search: {url : lockerRoot + '/Me/searchapp/', id : 'searchapp'}}
    res.end(JSON.stringify(apps));
});

app.get('/config.js', function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/javascript','Access-Control-Allow-Origin' : '*' });
    //this might be a potential script injection attack, just sayin.
    var config = {lockerHost:rootHost,
                  lockerPort:rootPort,
                  lockerBase:lockerRoot,
                  externalBase:externalBase};
    res.end('lconfig = ' + JSON.stringify(config) + ';');
});

// doesn't this exist somewhere? was easier to write than find out, meh!
function intersect(a,b) {
    if(!a || !b) return false;
    for(var i=0;i<a.length;i++)
        for(var j=0;j<b.length;j++)
            if(a[i] == b[j]) return a[i];
    return false;
}
function ensureMap(callback) {
    if (!map || !map.available) {
        request.get({uri:lockerRoot + '/map'}, function(err, resp, body) {
            map = JSON.parse(body);
            callback();
        });
    } else {
        process.nextTick(callback);
    }
}


