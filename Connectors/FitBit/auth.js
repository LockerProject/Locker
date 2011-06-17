/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/*
* 
* This module wraps all authentication functionality with the FitBit API
*/

var fs = require("fs");

var uri,
    completedCallback = null,
    newApp;

exports.auth = {};

// Check if exports.auth contains the required properties (consumerKey, consumerSecret, and token)
// if not, read it from disk and try again
function isAuthed() {
    try {
        if(!exports.hasOwnProperty("auth"))
            exports.auth = {};
        
        // Already have the stuff read
        if(exports.auth.hasOwnProperty("consumerKey") && 
           exports.auth.hasOwnProperty("consumerSecret") && 
           exports.auth.hasOwnProperty("token")) {
            return true;
        }
        // Try and read it in
        var authData = JSON.parse(fs.readFileSync("auth.json"));
        if(authData.hasOwnProperty("consumerKey") && 
           authData.hasOwnProperty("consumerSecret") && 
           authData.hasOwnProperty("token")) {
            exports.auth = authData;
            return true;
        }
    } catch (E) {
        // TODO:  Could actually check the error type here
    }
    return false;
}

exports.isAuthed = isAuthed;

// The required exported function
// Checks if there is a valid auth, callback immediately (and synchronously) if there is
// If there isn't, adds /auth and /saveAuth endpoint to the app
exports.authAndRun = function(app, externalUrl, onCompletedCallback) {
    if (isAuthed()) {
        onCompletedCallback();
        return;
    }
    
    // not auth'd yet, save the app's uri and the function to call back to later
    uri = externalUrl;
    newApp = 'http://dev.fitbit.com/apps/new';
    completedCallback = onCompletedCallback;
    app.get("/auth", handleAuth);
    app.get("/saveAuth", saveAuth);
}

// Handles requests to the /auth endpoint
// This will be called 3 times:
// 1. To captue the consumerKey and consumerSecret via a form (which posts to /saveAuth)
// 2. Use the consumerKey and consumerSecret to contruct the url to redirect to
// 3. Capture the access token when the person returns
function handleAuth(req, res) {
    if(!exports.auth)
        exports.auth = {};
        
    if(!(exports.auth.hasOwnProperty("consumerKey") && 
         exports.auth.hasOwnProperty("consumerSecret"))) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end("<html>Enter your personal FitBit app info that will be used to sync your data" + 
                " (create a new one <a href='" + newApp + "' target='_blank'>here</a> " +
                "using the callback url of " + uri + "auth) " +
                "<form method='get' action='saveAuth'>" +
                    "Consumer Key: <input name='consumerKey'><br>" +
                    "Consumer Secret: <input name='consumerSecret'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form></html>");
    } else if(!exports.auth.token) {
        require('fitbit-js')(exports.auth.consumerKey, exports.auth.consumerSecret, uri + 'auth')
            .getAccessToken(req, res, function(err, newToken) {
            if(err)
                console.error(err);
            if(newToken != null) {
                exports.auth.token = newToken;
                fs.writeFileSync('auth.json', JSON.stringify(exports.auth));
                completedCallback();
                res.redirect(uri);
            }
        });    
    } else { 
        completedCallback();
    }
}

// Save the consumerKey and consumerSecret
function saveAuth(req, res) {
    if(!req.param('consumerKey') || !req.param('consumerSecret')) {
        res.writeHead(400);
        res.end("missing field(s)?");
    } else {
        exports.auth.consumerKey = req.param('consumerKey');
        exports.auth.consumerSecret = req.param('consumerSecret');
        res.redirect(uri + 'auth');
    }
}
