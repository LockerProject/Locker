/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require('request'),
    lfs = require('../lfs.js'),
    fs = require('fs'),
    options = {provider :            'Some oauth2 consumer',
               endPoint :            'http://consumer.com/oauth/',
               linkToCreate :        'http://change.me/',
               appIDName :           'App ID',
               authEndpoint :        'authorize', 
               appSecretName :       'App Secret',
               promptForUsername :   false,
               accessTokenResponse : 'text',
               grantType :           '',
               extraParams :         ''};

var completedCallback, me;

exports.auth = {};
exports.options = {};

exports.authAndRun = function(app, onCompletedCallback) {
    me = app.meData;
    for (i in exports.options) {
        options[i] = exports.options[i];
    }
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

        // Try to read it in
        var authData = JSON.parse(fs.readFileSync('auth.json', 'utf-8'));
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
        if (options.promptForUsername) {
            var prompt = "Username: <input name='username'><br>";
        } else {
            var prompt = "";
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end("<html>Enter your personal " + options.provider + " app info that will be used to sync your data" + 
                " (create a new one <a href='" + options.linkToCreate + "' target='_blank'>here</a>" +
                " using a callback url of " + me.uri + "auth/) " +
                "<form method='post' action='saveAuth'>" + 
                    prompt +
                    options.appIDName + ": <input name='appKey'><br>" +
                    options.appSecretName + ": <input name='appSecret'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form></html>");
    } else {
        var newUrl = options.endPoint + "/" + options.authEndpoint + '?client_id=' + exports.auth.appKey + 
                        '&response_type=code&redirect_uri=' + me.uri + 'auth/';
        sys.debug('redirecting to ' + newUrl + 'auth');
        if (options.extraParams) {
            newUrl += "&" + options.extraParams;
        }
        res.redirect(newUrl);
    }
}

function handleAuth(req, res) {
    var newUrl = options.endPoint + '/access_token' +
                    '?client_id=' + exports.auth.appKey +
                    '&client_secret=' + exports.auth.appSecret +
                    '&grant_type=' + options.grantType +
                    '&redirect_uri=' + me.uri + 'auth/' +
                    '&code=' + req.param('code');
    request.get({url:newUrl}, function(err, resp, body) {
        if (options.accessTokenResponse == 'json') {
            exports.auth.accessToken = JSON.parse(body).access_token;
        } else {
            console.log("resp", resp);
            console.log("body", body);
            exports.auth.accessToken = querystring.parse(body).access_token;
        }
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
    exports.auth.username = req.param('username') || '';
    exports.auth.appKey = req.param('appKey');
    exports.auth.appSecret = req.param('appSecret');
    res.redirect(me.uri + 'go');
}