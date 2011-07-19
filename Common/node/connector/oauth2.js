/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require('request'),
    lfs = require('lfs'),
    fs = require('fs'),
    sys = require('sys'),
    querystring = require('querystring'),
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

var completedCallback, externalUrl;

exports.auth = {};
exports.options = {};

exports.authAndRun = function(app, externalUrl, onCompletedCallback) {
    options.redirectURI = externalUrl;
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
        exports.auth = authData;
        if(authData.hasOwnProperty("accessToken")) {
            return true;
        }
    } catch (E) {
        // TODO:  Could actually check the error type here
    }
    return false;
};

function go(req, res, error) {
    if(!(exports.auth.appKey && exports.auth.appSecret)) {
        if (options.promptForUsername) {
            var prompt = "Username: <input name='username'><br>";
        } else {
            var prompt = "";
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        if (error) {
            error = '<h1>Got an error while attempting to authenticate : ' + error + "</h1><p>Please reenter your credentials below.</p>";
        } else {
            error = "";
        }
        res.end("<html>" + error + "Enter your personal " + options.provider + " app info that will be used to sync your data" + 
                " (create a new one <a href='" + options.linkToCreate + "' target='_blank'>here</a>" +
                " using a callback url of " + options.redirectURI + "auth/) " +
                "<form method='post' action='saveAuth'>" + 
                    prompt +
                    options.appIDName + ": <input name='appKey'><br>" +
                    options.appSecretName + ": <input name='appSecret'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form></html>");
    } else {
        var newUrl = options.endPoint + "/" + options.authEndpoint + '?client_id=' + exports.auth.appKey + 
                        '&response_type=code&redirect_uri=' + options.redirectURI + 'auth/';
        sys.debug('redirecting to ' + newUrl);
        if (options.extraParams) {
            newUrl += "&" + options.extraParams;
        }
        res.redirect(newUrl);
    }
}

function handleAuth(req, res) {
    if (req.param('code')) {
        var newUrl = options.endPoint + '/access_token' +
                        '?client_id=' + exports.auth.appKey +
                        '&client_secret=' + exports.auth.appSecret +
                        '&grant_type=' + options.grantType +
                        '&redirect_uri=' + options.redirectURI + 'auth/' +
                        '&code=' + req.param('code');
        request.get({url:newUrl}, function(err, resp, body) {
            if (options.accessTokenResponse == 'json') {
                exports.auth.accessToken = JSON.parse(body).access_token;
            } else {
                exports.auth.accessToken = querystring.parse(body).access_token;
            }
            lfs.writeObjectToFile("auth.json", exports.auth);
            completedCallback(exports.auth);
            res.redirect(options.redirectURI);
        });
    } else {
        exports.auth = {};
        console.error('DEBUG: req.param(error)', req.param('error'));
        go(req, res, req.param('error'));
    }
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
    res.redirect(options.redirectURI + 'go');
}