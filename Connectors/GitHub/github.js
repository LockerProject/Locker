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
                    connect.cookieParser()),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js'),
    authLib = require('./auth.js');
    
    
var ghsync = require('./sync.js');

var me, auth, github;

app.set('views', __dirname);
app.get('/', handleIndex);

function handleIndex(req, res) {
    if(!auth || !auth.username || !auth.access_token) {
        authLib.handleIncompleteAuth(req, res);
    } else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(fs.readFileSync(__dirname + '/ui/index.html'));
    }
}

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


app.get('/sync/profile', function(req, res) {
    getGitHub().syncProfile(function() {
        res.writeHead(200);
        res.end();
        locker.at('/sync/profile', 3600);
    })
});

app.get('/get_profile', function(req, res) {
    getGitHub().getRepos(function(profile) {
        res.writeHead(200, {'Content-Type':'application/json'});
        res.end(JSON.stringify(profile));
    });
});
app.get('/sync/repos', function(req, res) {
    getGitHub().syncRepos(function() {
        res.writeHead(200);
        res.end();
        locker.at('/sync/repos', 3600);
    })
});

app.get('/get/repos', function(req, res) {
    getGitHub().getRepos(function(repos) {
        res.writeHead(200, {'Content-Type':'application/json'});
        res.end(JSON.stringify(repos));
    });
});

function getGitHub() {
    if(!github && auth) {
        github = ghsync.createClient(auth);
        github.on('new-watcher', function(newWatcherEvent) {
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
        authLib.init(me.uri, auth, app, function(newAuth, req, res) {
            auth = newAuth;
            fs.writeFileSync('auth.json', JSON.stringify(auth));
            if(req && res)
                handleIndex(req, res);
            return;
        });
        app.listen(processInfo.port,function() {
            var returnedInfo = {port: processInfo.port};
            console.log(JSON.stringify(returnedInfo));
        });
    });
});
