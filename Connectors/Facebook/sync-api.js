/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    sync = require('./sync'),
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

    app.get('/friends', friends);
    app.get('/newsfeed', newsfeed);
    app.get('/wall', wall);
    app.get('/profile', profile);
    app.get('/photos', photos);

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
	h += "Your Facebook Connector is all set up! You can manually sync data here:<br/><br/>";
	h += "<li><a href='friends'>friends</a></li>";
        h += "<li><a href='newsfeed'>newsfeed</a></li>";
        h += "<li><a href='wall'>wall</a></li>";
        h += "<li><a href='profile'>profile</a></li>";
        h += "<li><a href='photos'>photos</a></li>";
	h += "</body></html>"

        res.end(h);
    }
}

function friends(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    sync.syncFriends(function(err, repeatAfter, diaryEntry) {
        locker.diary(diaryEntry);
        locker.at('/friends', repeatAfter);
        res.end(JSON.stringify({success: "done fetching friends"}));
    });
}

function newsfeed(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    sync.syncNewsfeed(function(err, repeatAfter, diaryEntry) {
        locker.diary(diaryEntry);
        locker.at('/newsfeed', repeatAfter);
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
        res.end(msg);
    });
}