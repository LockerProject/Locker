/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    lstate = require('lstate'),
    sync = require('./sync'),
    async = require('async'),
    locker = require('../../Common/node/locker.js');
    
var app, auth;

module.exports = function(theapp) {
    app = theapp;
    app.get('/', index);
    this.authComplete = authComplete;
    return this;
};

function authComplete(theauth, mongo) {
    auth = theauth;
    sync.init(auth, mongo);
    lstate.set("status","waiting for next sync");
    lstate.set("syncing",0);

    app.get('/friends', friends);
    app.get('/newsfeed', newsfeed);
    app.get('/wall', wall);
    app.get('/profile', profile);
    app.get('/photos', photos);
    app.get('/state', state);
    app.get('/sync', allsync);

    sync.eventEmitter.on('contact/facebook', function(eventObj) {
        locker.event('contact/facebook', eventObj);
    });
    sync.eventEmitter.on('link/facebook', function(eventObj) {
        locker.event('link/facebook', eventObj);
    });
}

function index(req, res) {
    if(!(auth && auth.accessToken))
        res.redirect(app.externalBase + 'go');
    else {
        res.writeHead(200, {'Content-Type': 'text/html'});
	
	// TODO: move to template
	var h = "<html><head><title>Facebook Connector</title></head><body>";
	h += "Your Facebook Connector is all set up! You can manually sync data here:<br/><br/><h3><a href='sync'>sync it all!</a></h3>or:<br>";
	h += "<li><a href='friends'>friends</a></li>";
        h += "<li><a href='newsfeed'>newsfeed</a></li>";
        h += "<li><a href='wall'>wall</a></li>";
        h += "<li><a href='profile'>profile</a></li>";
        h += "<li><a href='photos'>photos</a></li>";
	h += "</body></html>"

        res.end(h);
    }
}

function state(req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    if(!(auth && auth.accessToken))
    {
        lstate.set("ready",0);
    }
    res.end(JSON.stringify(lstate.state()));
}

// this is shattily duplicating a lot of code but I don't want to reflacktor it yet
function allsync(req, res) {
    res.end(JSON.stringify({success:"background syncing"}));
    lstate.up("syncing");
    async.series([
        function(cb){
            lstate.set("status","syncing friends");
            sync.syncFriends(function(err, repeatAfter, diaryEntry) {
                lstate.set("status","done syncing friends");
                locker.diary(diaryEntry);
                locker.at('/friends', repeatAfter);
                cb();
            });
        },
        function(cb){
            lstate.set("status","syncing newsfeed");
            sync.syncNewsfeed(function(err, repeatAfter, diaryEntry) {
                lstate.set("status","done syncing newsfeed");
                locker.diary(diaryEntry);
                locker.at('/newsfeed', repeatAfter);
                cb();
            });
        },
        function(cb){
            lstate.set("status","syncing wall");
            sync.syncWall(function(err, repeatAfter, diaryEntry) {
                lstate.set("status","done syncing wall");
                locker.diary(diaryEntry);
                locker.at('/wall', repeatAfter);
                cb();
            });
        },
        function(cb){
            lstate.set("status","syncing photos");
            sync.syncPhotos(function(err, msg) {
                lstate.set("status","done syncing photos");
                locker.diary(msg);
                cb();
            });
        }
    ],
    function(){
        lstate.set("status","done syncing");
        lstate.down("syncing");
    });
}

function friends(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    lstate.set("status","syncing friends");
    lstate.up("syncing");
    sync.syncFriends(function(err, repeatAfter, diaryEntry) {
        lstate.set("status","done syncing friends");
        lstate.down("syncing");
        locker.diary(diaryEntry);
        locker.at('/friends', repeatAfter);
        res.end(JSON.stringify({success: "done fetching friends"}));
    });
}

function newsfeed(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    lstate.set("status","syncing newsfeed");
    lstate.up("syncing");
    sync.syncNewsfeed(function(err, repeatAfter, diaryEntry) {
        lstate.set("status","done syncing newsfeed");
        lstate.down("syncing");
        locker.diary(diaryEntry);
        locker.at('/newsfeed', repeatAfter, "newsfeed");
        res.end(JSON.stringify({success: "done fetching newsfeed"}));
    });
}

function wall(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    sync.syncWall(function(err, repeatAfter, diaryEntry) {
        locker.diary(diaryEntry);
        locker.at('/wall', repeatAfter);
        res.end(JSON.stringify({success: "done fetching wall"}));
    });
}

function profile(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    sync.syncProfile(function(err, repeatAfter, diaryEntry) {
        locker.diary(diaryEntry);
        locker.at('/profile', repeatAfter);
        res.end(JSON.stringify({success: "done fetching profile"}));
    });
}

function photos(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    sync.syncPhotos(function(err, msg) {
        locker.diary(msg);
        res.end(msg);
    });
}