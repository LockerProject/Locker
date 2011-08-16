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
    lcrypto = require("lcrypto"),
    fs = require('fs');

var lconfig = require('lconfig');
//TODO: fix lconfig and remove this!
lconfig.load('../../Config/config.json');

//TODO: this is almost definitely a race condition!
lcrypto.loadKeys(function(){});

var completedCallback, uri;

exports.auth = {};

exports.authAndRun = function(app, externalUrl, onCompletedCallback) {
    uri = externalUrl;
    
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
        console.error('DEBUG: authData', authData);
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
        if(E.code !== 'EBADF')
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
    lcrypto.loadKeys(function() {
        // We put in the encrypted values for writing to the disk
        exports.auth.username = lcrypto.encrypt(req.body.username);
        exports.auth.password = lcrypto.encrypt(req.body.password);
        exports.auth.host = req.body.host;
        exports.auth.port = req.body.port;
        exports.auth.secure = req.body.secure;
        lfs.writeObjectToFile('auth.json', exports.auth);
        // Put back the non encrypted values
        exports.auth.username = req.body.username;
        exports.auth.password = req.body.password;
        completedCallback(exports.auth);
        res.redirect(uri);
    });
}
