/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/


var fs = require('fs');
var express = require('express'),connect = require('connect');
var app = express.createServer(connect.bodyParser(), connect.cookieParser());
var locker = require('locker');
var lfs = require('lfs');
var request = require('request');

var me;
var processInfo;

app.set('views', __dirname);

app.get('/', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    request.get({url:locker.lockerBase+'/Me/smtp/state', json:true}, function(err, r, body){
        if(err || !body || !body.ready == 1) return res.end("you need to set up <a href='../smtp/'>sending email</a> first");
        res.end(fs.readFileSync(__dirname + '/ui/index.html'));
    });
});

app.get('/enable', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    me.enabled = req.param("to");
    lfs.syncMeData(me);
    res.end("Enabled");
    send();
});

app.get('/disable', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    me.enabled = false;
    lfs.syncMeData(me);
    res.end("Disabled");
});

app.get('/send', function (req, res) {
    res.end("sent");
    send();
});

function send()
{
    if(!me.enabled) return;
    locker.at('/send',86395);
    request.get({uri:processInfo.lockerUrl+"/Me/photos/?limit=1000"},function(err, res, body){
        if(err)
        {
            console.log("failed to get photos: "+err);
            return;
        }
        var photos = JSON.parse(body);
        // ideally this is a lot smarter, about weighting history, tracking to not do dups, etc
        var rand = Math.floor(Math.random() * photos.length);
        // Message object
        var message = {
            sender: 'Reminisce <42@awesome.com>',
            to: me.enabled,
            subject: 'something fun and random',
            body: 'Hello to myself!',
            html:'<p><b>reminiscing...</b> <img src="' + photos[rand].url + '"/></p>'
        };
        request.post({uri:locker.lockerBase+'/Me/smtp/send', json:message});
    });
};

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    me = lfs.loadMeData();
    app.listen(processInfo.port,function() {
        var returnedInfo = {};
        console.log(JSON.stringify(returnedInfo));
    });
});

