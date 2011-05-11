/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var fs = require("fs");

var uri, 
    auth, 
    completedCallback = null;

exports.isAuthed = function() {
    try {
        // Already have the stuff read
        if (exports.hasOwnProperty("consumerKey") && exports.hasOwnProperty("consumerSecret")) {
            return true;
        }
        // Try and read it in
        var authData = JSON.parse(fs.readFileSync("auth.json"));
        if (authData.hasOwnProperty("consumerKey") && authData.hasOwnProperty("consumerSecret")) {
            exports.consumerKey = authData.consumerKey;
            exports.consumerSecret = authData.consumerSecret;
            return true;
        }
    } catch (E) {
        // TODO:  Could actually check the error type here
    }
    return false;
}


exports.authAndRun = function(app, onCompletedCallback) {
    if (exports.isAuthed()) {
        onCompletedCallback();
        return;
    }
    completedCallback = onCompletedCallback;
    app.get("/auth", handleAuth);
    app.get("/saveAuth", saveAuth);
}

function handleAuth(req, res) {
    if(!exports.isAuthed()) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end("<html>Enter your personal Twitter app info that will be used to sync your data" + 
                " (create a new one <a href='http://dev.twitter.com/apps/new'>here</a> " +
                "using the callback url of http://"+url.parse(uri).host.replace("localhost", "127.0.0.1")+"/) " +
                "<form method='get' action='saveAuth'>" +
                    "Consumer Key: <input name='consumerKey'><br>" +
                    "Consumer Secret: <input name='consumerSecret'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form></html>");
    } else if(!exports.token) {
        require('./twitter_client')(exports.consumerKey, exports.consumerSecret, uri + 'auth')
            .getAccessToken(req, res, function(err, newToken) {
            if(err)
                console.error(err);
            if(newToken != null) {
                exports.token = newToken;
                completedCallback();
            }
        });    
    } else { 
        completedCallback();
    }
}

function saveAuth(req, res) {
    if(!req.param('consumerKey') || !req.param('consumerSecret')) {
        res.writeHead(400);
        res.end("missing field(s)?");
    } else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        exports.consumerKey = req.param('consumerKey');
        exports.consumerSecret = req.param('consumerSecret');
        res.end("<html>thanks, now we need to <a href='./auth'>auth that app to your account</a>.</html>");
    }
}
