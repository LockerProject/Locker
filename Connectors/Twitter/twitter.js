/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var express = require('express'),
    connect = require('connect'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js'),
    authLib = require('./auth');

// Setup the basic web server
var app = express.createServer(
    connect.bodyParser(),
    connect.cookieParser(),
    connect.session({secret : "locker"})
);    

// This only adds the / endpoint, the rest are added in the authComplete function
var syncApi = require(__dirname + "/sync-api.js")(app);
var started = false;

process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
    // Do the initialization bits
    var processInfo = JSON.parse(chunk);
    // TODO:  Is there validation to do here?
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    
    // We're adding this info to app for basic utility use
    app.meData = lfs.loadMeData();
    locker.connectToMongo(function(collections) {
        // Adds the internal API to the app because it should always be available
        require("../../Common/node/lapi.js")(app, "id_str", collections);
        // If we're not authed, we add the auth routes, otherwise add the sync API
        authLib.authAndRun(app, function() {
            // Add the rest of the sync API (only / is added automatically)
            syncApi.authComplete(authLib.auth, collections);
            if(!started)
                startWebServer();
        });
        
        if(!authLib.isAuthed())
            startWebServer();
        
        function startWebServer() {
            started = true;
            // Start the core web server
            app.listen(processInfo.port, function() {
                // Tell the locker core that we're done
                var returnedInfo = {port: processInfo.port};
                process.stdout.write(JSON.stringify(returnedInfo));
            });
        }
    });
});
process.stdin.resume();