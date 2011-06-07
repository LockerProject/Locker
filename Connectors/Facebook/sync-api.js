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

function authComplete(theauth, mongoCollections) {
    auth = theauth;
    sync.init(auth, mongoCollections);

    app.get('/friends', friends);
    app.get('/newsfeed', newsfeed);
    app.get('/wall', wall);

    sync.eventEmitter.on('contact/facebook', function(eventObj) {
        locker.event('contact/facebook', eventObj);
    });
    sync.eventEmitter.on('link/facebook', function(eventObj) {
        locker.event('link/facebook', eventObj);
    });
}

function index(req, res) {
    if(!(auth && auth.accessToken))
        res.redirect(app.meData.uri + 'go');
    else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end("<html>found a token, load <a href='friends'>friends</a>, your <a href='newsfeed'>newsfeed</a>, or your <a href='wall'>wall</a></html>");
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