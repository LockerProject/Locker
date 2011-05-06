/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/**
 * web server/service to wrap interactions w/ GitHub API
 */

var fs = require('fs'),
    url = require('url'),
    express = require('express'),
    connect = require('connect'),
    sys = require('sys'),
    app = express.createServer(
                    connect.bodyParser(),
                    connect.cookieParser(),
                    connect.session({secret : "locker"})),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');
    
var ghlib = require('./lib.js');

var me, auth, github;

app.set('views', __dirname);
app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    if(!auth.username) {
        res.end("<html>Enter your personal GitHub username" +
                "<form method='post' action='/save'>" +
                    "Username: <input name='username'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form></html>");
        return;
    } else
        res.end("<html>We've got a username, <a href='./syncprofile'>sync profile</a></html>");
});


app.post('/save',
function(req, res) {
    if(!req.param('username')) {
        res.writeHead(400);
        res.end("missing field(s)?");
        return;
    }
    res.writeHead(200, {
        'Content-Type': 'application/json'
    });
    auth.username = req.param('username');
    lfs.writeObjectToFile('auth.json', auth);
    res.end("<html>k thanks. <a href='/'>head home</a></html>");
});

app.get('/syncrepo/:repo', function(req, res) {
    var repo = req.params.repo;
    if(!repo) {
        res.writeHead(400);
        res.end('need repo info dood!');
        return;
    }
    getGitHub().syncWatchersInfo(repo);
    res.writeHead(200);
    res.end();
});


app.get('/syncprofile', function(req, res) {
    getGitHub().syncProfile(function() {
        res.writeHead(200);
        res.end();
    })
})

app.get('/get_profile', function(req, res) {
    getGitHub().getProfile(function(profile) {
        res.writeHead(200, {'Content-Type':'application/json'});
        res.end(JSON.stringify(profile));
    });
})

function getGitHub() {
    if(!github) {
        github = ghlib.createClient('quartzjer');
        github.on('new-watcher', function(newWatcherEvent) {
//            console.log('got new watcher:', newWatcherEvent);
            locker.event('contact/github', newWatcherEvent);
        });
    }
    return github;
}

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    me = lfs.loadMeData();
    lfs.readObjectFromFile('auth.json', function(newAuth) {
        auth = newAuth;
        app.listen(processInfo.port,function() {
            var returnedInfo = {port: processInfo.port};
            console.log(JSON.stringify(returnedInfo));
        });
    });
});
