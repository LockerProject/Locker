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
    started = false,
    syncApi = require(__dirname + "/sync-api.js")(app);
    
// Process the startup JSON object
process.stdin.setEncoding('utf8');
process.stdin.on("data", function(data) {
    // Do the initialization bits
    var processInfo = JSON.parse(data);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    
    app.meData = lfs.loadMeData();
    locker.connectToMongo(function(collections) {
        require("../../Common/node/lapi.js")(app, "id", collections);
        authLib.authAndRun(app, function() {
            syncApi.authComplete(authLib.auth, collections);
            if (!started) {
                startWebServer();
            }
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
        
    })
});
process.stdin.resume();
