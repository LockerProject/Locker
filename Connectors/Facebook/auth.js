/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var fs = require("fs");

var express = require('express'),
    connect = require('connect'),
    app = express.createServer(
                    connect.bodyParser(),
                    connect.cookieParser());
                    
var facebookClient = require('facebook-js')();
var uri, completedCallback;

var styles = require('./styles.js');
var format = function(content) {
    return styles.format(content);
};

exports.auth = {};
function isAuthed() {
    try {
        if(!exports.hasOwnProperty("auth"))
            exports.auth = {};
        
        // Already have the stuff read
        if(exports.auth.hasOwnProperty("appID") && 
           exports.auth.hasOwnProperty("appSecret") && 
           exports.auth.hasOwnProperty("token")) {
            return true;
        }    

        // Try and read it in
        var authData = JSON.parse(fs.readFileSync("auth.json"));
        if(authData.hasOwnProperty("appID") && 
           authData.hasOwnProperty("appSecret") && 
           authData.hasOwnProperty("token")) {
            exports.auth = authData;
            return true;
        }
    } catch (E) {
        // TODO:  Could actually check the error type here
    }
    return false;
}


exports.authAndRun = function(app, onCompletedCallback) {
    if (isAuthed()) {
        onCompletedCallback();
        return;
    }
    uri = app.meData.uri;
    completedCallback = onCompletedCallback;
    app.get("/auth", handleAuth);
    app.post("/saveAuth", saveAuth);
}

exports.init = function(baseUri, storedAuth, app, onCompletedCallback) {
    uri = baseUri;
    completedCallback = onCompletedCallback;
    auth = storedAuth || {};
    if(auth.appID && auth.appSecret && auth.token) {
        completedCallback(auth, null, null);
    } else {
        app.get('/auth', handleAuth);
        app.get('/saveAuth', saveAuth);
    }
}
    
function handleAuth(req, res) {
    if(!exports.auth)
        exports.auth = {};

    if(!req.param('code')) {
        if(!(exports.auth.appID && exports.auth.appSecret)) {
            res.writeHead(200);
            res.end(format("Enter your personal FaceBook app info that will be used to sync your data" + 
                    " (create a new one <a href='http://www.facebook.com/developers/createapp.php'>here</a>" +
                    " using a callback url of http://"+url.parse(uri).host+"/) " +
                    "<form method='post' action='saveAuth'>" +
                        "App ID: <input name='appID'><br>" +
                        "App Secret: <input name='appSecret'><br>" +
                        "<input type='submit' value='Save'>" +
                    "</form>"));
            return;
        }
        if(!exports.auth.token) {
            res.writeHead(200);
            res.end(displayHTML(getGoFB()));
        }
        else
            completedCallback(auth, req, res);
    } else {
        var OAuth = require("oauth").OAuth2;
        var oa = new OAuth(exports.auth.appID, exports.auth.appSecret, 'https://graph.facebook.com');
        oa.getOAuthAccessToken(req.param('code'), {redirect_uri: uri+"auth"}, function(err, token, refresh) {
            if (err) {
                res.writeHead(500, {'Content-Type': 'text/html'});
                res.end(displayHTML("uhoh " + JSON.stringify(err)));
            } else {
                exports.auth.token = token;
                fs.writeFileSync('auth.json', JSON.stringify(exports.auth));
                res.redirect(uri);
                completedCallback(exports.auth, req, res);
            }
        });
    }
}

function saveAuth(req, res) {
    if(!(req.body.appID && req.body.appSecret)) {
        res.writeHead(400, {'Content-Type': 'text/html'});
        res.end(format("missing field(s)?"));
        return;
    }
    res.writeHead(200, {'Content-Type': 'text/html'});
    exports.auth.appID = req.body.appID;
    exports.auth.appSecret = req.body.appSecret;
    res.end(format(getGoFB()));
}

function getGoFB() {
    return "you need to <a href='" + getAuthURI() + "'>auth w/ fb</a> yet";
}

function getAuthURI() {
    return facebookClient.getAuthorizeUrl({client_id: exports.auth.appID, redirect_uri: uri+"auth",
                scope: 'email,offline_access,read_stream,user_photos,friends_photos,publish_stream'});
}