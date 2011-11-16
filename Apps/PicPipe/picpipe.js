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
var url = require('url');

app.set('views', __dirname);

var photos = {};
var posts = {};
var lockerBase;
var flickr;

app.get('/', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    request.get({uri:lockerBase+"/Me/instagram/getCurrent/photo", json:true}, function(err, r, body){
        if(!body) return res.end("Instagram isn't connected or has no photos :(");
        for(var i in body)
        {
            if(body[i].caption && body[i].caption.text) photos[body[i].caption.text] = body[i];
        }
        request.get({uri:lockerBase+"/Me/wordpress/posts", json:true}, function(err, r, body){
            if(!body) return res.end("It seems your <a href='/Me/wordpress/'>Wordpress blog</a> isn't connected yet");
            tosync = [];
            var synced = "";
            for(var i in body)
            {
                var post = body[i];
                if(photos[post.title])
                {
                    synced += "<li><a href='"+post.permaLink+"'>"+post.title+"</a></li>";
                    delete photos[post.title];
                }
            }
            var tosync = Object.keys(photos);
            res.write("<form method='post'><h2>You have "+tosync.length+" Instagram photos to <input type='submit' value='sync' /> to your blog!</h2></form>");
            if(synced != "") synced = "Sync'd: <ul>" + synced;
            res.end(synced);
        })
    });
});

app.post('/', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    var tosync = Object.keys(photos);
    async.forEach(tosync, function(key, cb)
    {
        var photo = photos[key];
        var u = url.parse(lockerBase+'/Me/wordpress/newPost');
        u.query = {};
        u.query.title = photo.caption.text;
        u.query.description = "<a href='"+photo.link+"'><img src='"+photo.images.standard_resolution.url+"' style='border:0px' /></a>"
        console.error("doing "+url.format(u));
        request.get({uri:url.format(u)}, cb);
    }, function(){
        res.end("Done!");
    });
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

