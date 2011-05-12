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
        if(!(auth && auth.consumerKey && auth.consumerSecret && auth.token)) {
            res.redirect(app.meData.uri + 'auth');
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end("<html>great! now you can:<br><li><a href='home_timeline'>sync your timeline</a></li>" + 
                                                 "<li><a href='mentions'>sync your mentions</a></li>" + 
                                                 "<li><a href='friends'>sync your friends</a></li>" + 
                                                  "<li><a href='followers'>sync your followers</a></li>" +
                                                 "<li><a href='profile'>sync your profile</a></li>" +"</html>");
        }
    });
    return this;
}

// Adds all of the sync API endpoints once the auth process is completed
exports.authComplete = function(theAuth) {
    auth = theAuth;
    sync.init(auth);
    
    // Sync the person's home timline
    app.get('/home_timeline', function(req, res) {
        statuses('home_timeline', 60, res);
    });
    
    // Sync the person's metions
    app.get('/mentions', function(req, res) {
        statuses('mentions', 120, res);
    });
    
    // Sync a status stream endpoint (home_timeline, mentions, etc)
    function statuses(endpoint, repeatAfter, res) {
        sync.pullStatuses(endpoint, repeatAfter, function(err) {
            if(err) {
                res.writeHead(401, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error:err}));
                return;
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({success:"got "+endpoint+", happy day"}));
            }
        });
        
    }
    
    // Sync the person's friend data
    app.get('/friends', function(req, res) {
        people('friends', res);
    });
    
    // Sync the person's follower data
    app.get('/followers', function(req, res) {
        people('followers', res);
    });
    
    // Sync the person's friend or follower data
    function people(endpoint, res) {
        sync.syncUsersInfo(endpoint, function() {  
            res.writeHead(200, {'content-type':'application/json'});
            res.end(JSON.stringify({success:"done fetching " + endpoint}));
        });
    }
    
    // Sync the person's profile info
    app.get('/profile', function(req, res) {
        sync.syncProfile(function(err, userInfo) {
            res.writeHead(200, {'content-type':'application/json'});
            res.end(JSON.stringify({success:userInfo}));
        });
    });

    // Rate limit status (not currently used anywhere, will be part of calming)
    app.get('/rate_limit_status', function(req, res) {
        sync.getRateLimitStatus(function(status) {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(status));
        });
    });
}
