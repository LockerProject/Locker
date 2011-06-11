/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var locker = require('../../Common/node/locker.js'),
    sync = require('./sync');

var app, auth;

// Add the basic / head ups (or forward to /auth if needed)
module.exports = function(theApp) {
    app = theApp;
    
    app.get('/', function (req, res) {
        if(!(auth && auth.clientID && auth.clientSecret && auth.redirectURI && auth.token)) {
            res.redirect(app.meData.uri + 'auth');
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end("<html>great! now you can:<br>" + 
                        "<li><a href='getNew/contacts'>sync new contact entries</a></li>" +
                        "<li><a href='getNew/groups'>sync groups</a></li>" +
                        "</html>");
        }
    });
    this.authComplete = authComplete;
    return this;
}

// Adds all of the sync API endpoints once the auth process is completed
function authComplete(theAuth, mongo) {
    auth = theAuth;
    sync.init(auth, mongo);

    // Sync the person's contact data
    app.get('/getNew/:type', function(req, res) {
        var type = req.params.type.toLowerCase();
        if(type === 'contacts')
            sync.syncContacts(done);
        else if(type === 'groups')
            sync.syncGroups(done);
        res.writeHead(200, {'content-type':'application/json'});
        res.end(JSON.stringify({success:"fetching " + type}));
        
        function done(err, repeatAfter, diaryEntry) {
            if(diaryEntry)
                locker.diary(diaryEntry);
            locker.at('/getNew/' + type, repeatAfter);
        }
    });
    

    sync.eventEmitter.on('contact/google', function(eventObj) {
        locker.event('contact/google', eventObj);
    });
}
