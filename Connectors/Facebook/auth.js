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
    if(exports.isAuthed()) {
        onCompletedCallback();
        return;
    }
    completedCallback = onCompletedCallback;
    app.get('/go', go);
    app.get('/auth', handleAuth);
    app.post('/saveAuth', saveAuth);
};

exports.isAuthed = function() {
    try {
        if(!exports.auth)
            exports.auth = {};
        
        // Already have the stuff read
        if(exports.auth.hasOwnProperty("accessToken"))
            return true;

        console.error('isAuthed.reading in from', process.cwd());
        // Try to read it in
        var authData = JSON.parse(fs.readFileSync('auth.json', 'utf-8'));
        console.error('isAuthed.read and parsed', authData);
        if(authData.hasOwnProperty("accessToken")) {
            exports.auth = authData;
            return true;
        }
    } catch (E) {
        // TODO:  Could actually check the error type here
    }
    return false;
};

function go(req, res) {
    if(!(exports.auth.appKey && exports.auth.appSecret)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end("<html>Enter your personal Facebook app info that will be used to sync your data" + 
                " (create a new one <a href='http://www.facebook.com/developers/createapp.php'>here</a>" +
                " using a callback url of " + me.uri + "auth/) " +
                "<form method='post' action='saveAuth'>" +
                    "App ID: <input name='appKey'><br>" +
                    "App Secret: <input name='appSecret'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form></html>");
    } else {
        sys.debug('redirecting to ' + me.uri + 'auth');
        res.redirect('https://graph.facebook.com/oauth/authorize?client_id=' + exports.auth.appKey + 
                        '&response_type=code&redirect_uri=' + me.uri + 'auth/&' + 
                        'scope=email,offline_access,read_stream,user_photos,friends_photos,publish_stream');
    }
}

function handleAuth(req, res) {                    
    request.get({uri:'https://graph.facebook.com/oauth/access_token' +
                    '?client_id=' + exports.auth.appKey +
                    '&client_secret=' + exports.auth.appSecret +
                    '&redirect_uri=' + me.uri + 'auth/' +
                    '&code=' + req.param('code')}, function(err, resp, body) {
        exports.auth.accessToken = querystring.parse(body).access_token;
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
    res.redirect(me.uri + 'go');
}