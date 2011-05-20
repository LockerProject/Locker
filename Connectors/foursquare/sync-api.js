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

function authComplete(theauth) {
    auth = theauth;
    sync.init(auth);
    app.get('/friends', friends);
    app.get('/checkins', checkins);
}

function index(req, res) {
    if(!(auth && auth.accessToken))
        res.redirect(app.meData.uri + 'go4sq');
    else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end("<html>found a token, load <a href='friends'>friends</a> or <a href='checkins'>checkins</a></html>");
    }
}

function friends(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    sync.syncFriends(function(err, friendCount) {
        locker.diary("syncing "+friendCount+" friends");
        locker.at('/friends', 3600);
        res.end();
    });
}


function checkins(req, res) {
    sync.syncCheckins(function(err, checkinCount) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        locker.diary("sync'd "+checkinCount+" new checkins");
        locker.at('/checkins', 600);
        res.end("got "+checkinCount+" new checkins!");
    });
}
