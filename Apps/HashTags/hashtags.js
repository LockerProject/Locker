/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var url = require('url');
var express = require('express');
var connect = require('connect');
var request = require('request');
var fs = require("fs");
var path = require("path");
var querystring = require("querystring");

var app = express.createServer(connect.bodyParser(), connect.cookieParser());

var locker = require('../../Common/node/locker.js');
var lfs = require('../../Common/node/lfs.js');

var me;

app.get("/", function(req, res) {
    res.sendfile(__dirname + "/index.html");
});

app.get("/tagCounts", function(req, res) {
    locker.providers("contact/twitter", function(error, providers) {
        if (!providers || providers.length == 0) {
            res.writeHead(400);
            res.end("No twitter providers");
            return;
        }
        
        var fetchURL = providers[0].uri + "getCurrent/home_timeline";
        request.get({url:fetchURL}, function(error, request, result) {
            if (error || !result) {
                res.writeHead(400);
                res.end("No data");
                return;
            }
            var timeline = JSON.parse(result);
            tags = {};
            timeline.forEach(function(entry) {
                entry.entities.hashtags.forEach(function(tag) {
                    if (!tags.hasOwnProperty(tag.text)) tags[tag.text] = 0
                    tags[tag.text] += 1;
                });
            });
            res.writeHead(200, {"Content-Type":"application/json"});
            res.end(JSON.stringify(tags));
        });
    });
});

// Return static js files
app.get("/js/:filename", function(req, res) {
    console.log("Getting " + req.param("filename"));
    res.sendfile(__dirname + "/js/" + req.param("filename"));
});


// Woo woo startup stuff!
var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    me = lfs.loadMeData();
    app.listen(processInfo.port,function() {
        var returnedInfo = {port: processInfo.port};
        process.stdout.write(JSON.stringify(returnedInfo));
    });
});
stdin.resume();

