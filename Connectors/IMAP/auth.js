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
    lcrypto = require("../../Common/node/lcrypto"),
    fs = require('fs');

var completedCallback, uri;

lcrypto.loadKeys();

exports.auth = {};

exports.authAndRun = function(app, externalUrl, onCompletedCallback) {
    uri = externalUrl
    
    if(exports.isAuthed()) {
        onCompletedCallback();
        return;
    }
    completedCallback = onCompletedCallback;
    app.get('/go', go);
    app.post('/saveAuth', saveAuth);
};

exports.isAuthed = function() {
    try {
        if(!exports.auth) {
            exports.auth = {};
        }
        
        if((exports.auth.username && exports.auth.password && exports.auth.host && exports.auth.port)) {
            return true;
        }
    
        var authData = JSON.parse(fs.readFileSync('auth.json', 'utf-8'));
        
        if(authData.hasOwnProperty('username') && 
           authData.hasOwnProperty('password') && 
           authData.hasOwnProperty('host') && 
           authData.hasOwnProperty('port')) {
            authData.username = lcrypto.decrypt(authData.username);
            authData.password = lcrypto.decrypt(authData.password);
            exports.auth = authData;
            return true;
        }
    } catch (E) {
        console.error(E);
    }
    return false;
};

function go(req, res) {
    if(!(exports.auth.username && exports.auth.password && exports.auth.host && exports.auth.port)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end("<html>Enter your IMAP server info that will be used to sync your data" + 
                "<form method='post' action='saveAuth'>" + 
                    "Username: <input name='username'><br>" +
                    "Password: <input type='password' name='password'><br>" +
                    "Host: <input name='host' value='imap.gmail.com'><br>" +
                    "Port: <input name='port' value='993'><br>" +
                    "Host uses SSL: <input type='checkbox' name='secure' checked='checked' value='true'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form></html>");
    } else {
        sys.debug('redirecting to ' + uri);
        res.redirect(uri);
    }
}

function saveAuth(req, res) {
    // res.writeHead(200, {'Content-Type': 'text/html'});
    if(!req.body.username || !req.body.password || !req.body.host  || !req.body.port) {
        res.end("missing field(s)?");
        return;
    }
    // We put in the encrypted values for writing to the disk
    exports.auth.username = lcrypto.encrypt(req.param('username'));
    exports.auth.password = lcrypto.encrypt(req.param('password'));
    exports.auth.host = req.param('host');
    exports.auth.port = req.param('port');
    exports.auth.secure = req.param('secure');
    lfs.writeObjectToFile('auth.json', exports.auth);
    // Put back the non encrypted values
    exports.auth.username = req.param('username');
    exports.auth.password = req.param('password');
    completedCallback(exports.auth);
    res.redirect(uri);
}
