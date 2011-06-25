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
var app = express.createServer(connect.bodyParser());
var locker = require('../../Common/node/locker.js');
var lfs = require('../../Common/node/lfs.js');
var lconfig = require('../../Common/node/lconfig.js');
var exec = require('child_process').exec;
var util = require('util');
var request = require('request');

app.set('views', __dirname);

var dbox=false;
var lockerBase=false;
app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    locker.map(function(map){
        // find dropbox
        for(var id in map.installed)
        {
            if(map.installed[id].provides && map.installed[id].provides.indexOf("store/dropbox") >= 0)
            {
                dbox=id;
                res.end("<!--"+id+"-->Place a new Me_bu.tgz of your Me/ data in dropbox by running a <a href='./backup'>backup</a> right now (may take a while).");
                return;
            }
        }
        res.end("can't find dropbox, install it?");
    });
});

app.get('/backup',function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    res.write("<p>hold on, backing up in progress...\n");
    var child = exec('rm -f /tmp/Me_bu.tgz && tar -cvzf /tmp/Me_bu.tgz ./' + lconfig.me, {cwd: '../../'}, function (error, stdout, stderr) {
        if (error !== null) {
            res.end("failed: "+error+" stdout: "+stdout+" stderr: "+stderr);
            return;
        }
        res.write("<p>tgz created, dropboxing now...\n");
        var url = lockerBase+'/' + lconfig.me + '/'+dbox+'/save?file=/tmp/Me_bu.tgz';
        console.log("calling "+url);
        request.get({uri:url}, function(err, resp, body) {
            if(err)
            {
                res.end("uhoh: "+err+" "+body);
                return;
            }
            res.end("<p>great success!!!");
        });
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
