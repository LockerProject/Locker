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
    lstate = require('lstate'),
    querystring = require('querystring'),
    sys = require('sys'),
    async = require('async'),
    request = require('request'),
    lfs = require('../../Common/node/lfs.js'),
    locker = require('../../Common/node/locker.js'),
    sync = require('./sync');

var app, auth;

// Add the basic / head ups (or forward to /auth if needed)
module.exports = function(theApp) {
    app = theApp;
    lstate.set("status","waiting for next sync");
    lstate.set("syncing",0);
    
    app.get('/', function (req, res) {
        if(!(auth && auth.consumerKey && auth.consumerSecret && auth.token)) {
            res.redirect(app.externalBase + 'auth');
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end("<html>great! now you can:<br><h3><a href='sync'>sync it all!</a></h3>or: " +
                                                 "<li><a href='getNew/home_timeline'>sync new home_timeline entries</a></li>" + 
                                                 "<li><a href='getNew/user_timeline'>sync new user_timeline entries</a></li>" + 
                                                 "<li><a href='getNew/mentions'>sync new mentions</a></li>" + 
                                                 "<li><a href='getNew/friends'>sync new friends</a></li>" + 
                                                 "<li><a href='getNew/followers'>sync new followers</a></li>" +
                                                 "<li><a href='update/friends'>update existing friends</a></li>" + 
                                                 "<li><a href='update/followers'>update existing followers</a></li>" +
                                                 "<li><a href='update/profile'>sync your profile</a></li>" +"</html>");
        }
    });
    
    app.get('/status', function(req, res) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        if(!(auth && auth.token))
        {
            lstate.set("ready",0);
        }else{
            lstate.set("ready",1)
        }
        res.end(JSON.stringify(lstate.state()));        
    });
    this.authComplete = authComplete;
    return this;
}

// Adds all of the sync API endpoints once the auth process is completed
function authComplete(theAuth, mongo) {
    auth = theAuth;
    sync.init(auth, mongo);

    // manual sync of everything
    app.get('/sync', function(req, res){
        res.end(JSON.stringify({success:"background syncing"}));
        lstate.up("syncing");
        async.series([
            function(cb){
                lstate.set("status","syncing home_timeline");
                sync.pullStatuses("home_timeline",function(err,repeatAfter,diaryEntry){
                    lstate.set("status","done syncing home_timeline");
                    locker.diary(diaryEntry);
                    locker.at('/getNew/home_timeline', repeatAfter);
                    cb();
                });
            },
            function(cb){
                lstate.set("status","syncing user_timeline");
                sync.pullStatuses("user_timeline",function(err,repeatAfter,diaryEntry){
                    lstate.set("status","done syncing user_timeline");
                    locker.diary(diaryEntry);
                    locker.at('/getNew/user_timeline', repeatAfter);
                    cb();
                });
            },
            function(cb){
                lstate.set("status","syncing mentions");
                sync.pullStatuses("mentions",function(err,repeatAfter,diaryEntry){
                    lstate.set("status","done syncing mentions");
                    locker.diary(diaryEntry);
                    locker.at('/getNew/mentions', repeatAfter);
                    cb();
                });
            },
            function(cb){
                lstate.set("status","syncing friends");
                sync.syncUsersInfo("friends",function(err,repeatAfter,diaryEntry){
                    lstate.set("status","done syncing friends");
                    locker.diary(diaryEntry);
                    locker.at('/getNew/friends', repeatAfter);
                    cb();
                });
            },
            function(cb){
                lstate.set("status","syncing followers");
                sync.syncUsersInfo("followers",function(err,repeatAfter,diaryEntry){
                    lstate.set("status","done syncing followers");
                    locker.diary(diaryEntry);
                    locker.at('/getNew/followers', repeatAfter);
                    cb();
                });
            }
            ],function(){
                lstate.set("status","done syncing");
                lstate.down("syncing");
            });
        
    });

    // Sync the person's friend data
    app.get('/getNew/:type', function(req, res) {
        var type = req.params.type.toLowerCase();
        lstate.set("status","syncing "+type);
        lstate.up("syncing");

        if(type === 'friends' || type === 'followers')
            people(type, res);
        else if(type === 'mentions' || type === 'home_timeline' || type === 'user_timeline') {
            statuses(type, res);                
        }
    });

    // Sync the person's friend or follower data
    function people(type, res) {
        sync.syncUsersInfo(type, function(err, repeatAfter, diaryEntry) {
            if(err) {
                
            } else {
                lstate.set("status","done syncing "+type);
                lstate.down("syncing");
                locker.diary(diaryEntry);
                locker.at('/getNew/' + type, repeatAfter);
                res.writeHead(200, {'content-type':'application/json'});
                res.end(JSON.stringify({success:"done fetching " + type}));
            }
        });
    }

    // Sync a status stream endpoint (home_timeline, mentions, etc)
    function statuses(endpoint, res) {
        sync.pullStatuses(endpoint, function(err, repeatAfter, diaryEntry) {
            if(err) {
                res.writeHead(401, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error:err}));
                return;
            } else {
                lstate.set("status","done syncing "+endpoint);
                lstate.down("syncing");
                locker.at('/getNew/' + endpoint, repeatAfter);
                locker.diary(diaryEntry);
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({success:"got "+endpoint+", happy day"}));
            }
        });
    }
    
    app.get('/update/:type', function(req, res) {
        var type = req.params.type.toLowerCase();
        if(type == 'friends' || type == 'followers') {
            sync.updateProfiles(type, function() {
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
    
    sync.eventEmitter.on('status/twitter', function(eventObj) {
        locker.event('status/twitter', eventObj);
    });
    sync.eventEmitter.on('contact/twitter', function(eventObj) {
        locker.event('contact/twitter', eventObj);
    });
    sync.eventEmitter.on('link/twitter', function(eventObj) {
        locker.event('link/twitter', eventObj);
    });
}
