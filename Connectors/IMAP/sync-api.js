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
    dataStore = require('connector/dataStore'),
    locker = require('locker');
    
var app, auth;

module.exports = function(theApp) {
    app = theApp;
    app.get('/', index);
    this.authComplete = authComplete;
    return this;
};

function authComplete(theAuth, mongo) {
    auth = theAuth;
    sync.init(auth, mongo);

    app.get('/messages', messages);
    sync.eventEmitter.on('message/imap', function(eventObj) {
        locker.event('message/imap', eventObj);
    });
    dataStore.init('id', mongo);
}

function index(req, res) {
    if(!(auth && auth.username && auth.password && auth.host && auth.port)) {
        res.redirect(app.externalBase + 'go');
    } else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        dataStore.queryCurrent("messages", {}, function(err, cursor) {
            count = cursor.count(function(err, count) {
                res.end("<html>Found valid authentication, currently storing " + count + " messages<br>" + 
                        " sync your <a href='messages'>messages</a></html>");
            });
        });
    }
}

function messages(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(JSON.stringify({success: "fetching messages"}));
    sync.syncMessages(function(err, repeatAfter, diaryEntry) {
        if(err)
            console.error('error while syncing messages: ', err);
        if(diaryEntry)
            locker.diary(diaryEntry);
        if(repeatAfter)
            locker.at('/messages', repeatAfter);
    });
}