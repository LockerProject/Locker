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
}

function authComplete(theauth, mongoCollections) {
    auth = theauth;
    sync.init(auth, mongoCollections);

    app.get('/followers', followers);
    app.get('/following', following);
    app.get('/profile', profile);
    app.get('/repos', repos);
    sync.eventEmitter.on('contact/github', function(eventObj) {
        locker.event('contact/github', eventObj);
    });
}

function index(req, res) {
    if(!(auth && auth.accessToken))
        res.redirect(app.meData.uri + 'go');
    else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end("<html>found a token, load <a href='followers'>followers</a>, or <a href='following'>following</a>, or <a href='repos'>repos</a></html>");
    }
}

function following(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    sync.syncUsers("following", function(err, repeatAfter, diaryEntry) {
        locker.diary(diaryEntry);
        locker.at('/following', repeatAfter);
        res.end(JSON.stringify({success: "done fetching users you're following"}));
    });
}

function followers(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    sync.syncUsers("followers", function(err, repeatAfter, diaryEntry) {
        locker.diary(diaryEntry);
        locker.at('/followers', repeatAfter);
        res.end(JSON.stringify({success: "done fetching followers"}));
    });
}

function repos(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    sync.syncRepos(function(err, repeatAfter, diaryEntry) {
        locker.diary(diaryEntry);
        locker.at('/repos', repeatAfter);
        res.end(JSON.stringify({success: "done fetching repos"}));
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