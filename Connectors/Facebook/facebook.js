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
    app = express.createServer(connect.bodyParser()),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js'),
    authLib = require('./auth'),
    syncApi = require(__dirname + "/sync-api.js")(app);
    
// Process the startup JSON object
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(data) {
    // Do the initialization bits
    var processInfo = JSON.parse(data);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    
    app.meData = lfs.loadMeData();
    // Adds the internal API to the app because it should always be available
    require(__dirname + "/api.js")(app, function() {
        
        authLib.authAndRun(app, function() {
            syncApi.authComplete(authLib.auth, function() {
                if (!started) {
                    startWebServer();
                }
            });
        });
        
        if(!authLib.isAuthed())
            startWebServer();
        
        var started = false;
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
    
    
    

    // If we're not authed, we add the auth routes, otherwise add the webservice
});
process.stdin.resume();
