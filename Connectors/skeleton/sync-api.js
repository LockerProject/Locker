/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var locker = require('../../Common/node/locker.js');
var sync = require('./sync');
    
var app, auth;

module.exports = function(theapp) {
    app = theapp;
    app.get('/', index);
    this.authComplete = authComplete;
    return this;
}

// this function is called when the auth module has connected with the provider happily
function authComplete(theauth, mongo) {
    auth = theauth;
    sync.init(auth, mongo);

    // add each type of data point you want to scrape as an endpoint
    app.get('/items', items);
    
    // any status types that have been defined in the connector file need to be explcitly emitted back into the locker here
    sync.eventEmitter.on('event/Type', function(eventObj) {
        locker.event('event/Type', eventObj);
    });
}

function index(req, res) {
    if(!(auth && auth.accessToken))
        res.redirect(app.externalBase + 'auth');
    else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end("<html>found a token, load <a href='items'>items</a></html>");
    }
}

// this is the basic structure of an endpoint for something you'd be parsing.
function items(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    sync.syncItems(function(err, repeatAfter, diaryEntry) {
        locker.diary(diaryEntry);
        locker.at('/items', repeatAfter);
        res.end(JSON.stringify({success: "done fetching items"}));
    });
}