/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require('request'),
    lfs = require('../../Common/node/lfs.js'),
    fs = require('fs');

var completedCallback, me;

exports.auth = {};

exports.authAndRun = function(app, onCompletedCallback) {
    me = app.meData;
    if(isAuthed()) {
        onCompletedCallback();
        return;
    }
    completedCallback = onCompletedCallback;
    app.get('/go4sq', go4sq);
    app.get('/auth', handleAuth);
    app.post('/saveAuth', saveAuth);
}

function isAuthed() {
    try {
        if(!exports.auth)
            exports.auth = {};
        
        // Already have the stuff read
        if(exports.auth.hasOwnProperty("accessToken"))
            return true;

        console.error('isAuthed.reading in from', process.cwd());
        // Try to read it in
        var authData = JSON.parse(fs.readFileSync("auth.json", 'utf-8'));
        console.error('isAuthed.read and parsed', authData);
        if(authData.hasOwnProperty("accessToken")) {
            exports.auth = authData;
            return true;
        }
    } catch (E) {
        // TODO:  Could actually check the error type here
    }
    return false;
}

exports.isAuthed = isAuthed;

function go4sq(req, res) {
    if(!(exports.auth.appKey && exports.auth.appSecret)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end("<html>Enter your personal Foursquare app info that will be used to sync your data" + 
                " (create a new one <a href='https://foursquare.com/oauth/register'>" + 
                "here</a> using the callback url of " + me.uri+"auth) " +
                "<form method='post' action='saveAuth'>" +
                    "Client ID: <input name='appKey'><br>" +
                    "Client Secret: <input name='appSecret'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form></html>");
    } else {
        sys.debug('redirecting to ' + me.uri + 'auth');
        res.redirect('https://foursquare.com/oauth2/authenticate?client_id=' + exports.auth.appKey + 
                        '&response_type=code&redirect_uri=' + me.uri + 'auth');
    }
}

function handleAuth(req, res) {
    request.get({uri:'https://foursquare.com/oauth2/access_token' +
                    '?client_id=' + exports.auth.appKey +
                    '&client_secret=' + exports.auth.appSecret +
                    '&grant_type=authorization_code' +
                    '&redirect_uri=' + me.uri + 'auth' +
                    '&code=' + req.param('code')}, function(err, resp, body) {
        exports.auth.accessToken = JSON.parse(body).access_token;
        lfs.writeObjectToFile("auth.json", exports.auth);
        completedCallback(exports.auth);
        res.redirect(me.uri);
    });
}


function saveAuth(req, res) {
    // res.writeHead(200, {'Content-Type': 'text/html'});
    if(!req.body.appKey || !req.body.appSecret) {
        res.end("missing field(s)?");
        return;
    }
    exports.auth.appKey = req.param('appKey');
    exports.auth.appSecret = req.param('appSecret');
    res.redirect(me.uri + 'go4sq');
}