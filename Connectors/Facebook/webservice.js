/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    url = require('url'),
    querystring = require('querystring'),
    sys = require('sys'),
    request = require('request'),
    lfs = require('../../Common/node/lfs.js'),
    sync = require('./sync');

var app, auth;

// Add the basic / head ups (or forward to /auth if needed)
module.exports = function(theApp) {
    app = theApp;
    
    app.get('/', function (req, res) {
        if(!(auth && auth.appID && auth.appSecret && auth.token)) {
            res.redirect(app.meData.uri + 'auth');
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end("<html>great! now you can:<br><li><a href='getNew/friends'>sync new friends</a></li>" + 
                                                 "<li><a href='update/friends'>update existing friends</a></li>" + 
                                                 "<li><a href='update/profile'>sync your profile</a></li>" +"</html>");
        }
    });
    
    this.authComplete = authComplete;
    return this;
}

// Adds all of the sync API endpoints once the auth process is completed
function authComplete(theAuth, callback) {
    auth = theAuth;
    sync.init(auth, function() {

        // Sync the person's friend data
        app.get('/getNew/:type', function(req, res) {
            var type = req.params.type.toLowerCase();
            if(type === 'friends') {
                sync.syncUsersInfo(function() {  
                    res.writeHead(200, {'content-type':'application/json'});
                    res.end(JSON.stringify({success:'done fetching friends'}));
                });             
            }
        });
        
        app.get('/update/:type', function(req, res) {
            var type = req.params.type.toLowerCase();
            if(type === 'friends') {
                sync.updatePeople(function() {
                    res.writeHead(200, {'content-type':'application/json'});
                    res.end(JSON.stringify({success:'k, I\'m on it!'}));
                });
            } else if(type === 'profile') {
                sync.syncProfile(function(err, userInfo) {
                    res.writeHead(200, {'content-type':'application/json'});
                    res.end(JSON.stringify({success:userInfo}));
                });
            }
        })

        // Rate limit status (not currently used anywhere, will be part of calming)
        app.get('/rate_limit_status', function(req, res) {
            sync.getRateLimitStatus(function(status) {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(status));
            });
        });
        callback();
    });
}