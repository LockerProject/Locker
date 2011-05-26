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
    locker = require('../locker.js'),
    lfs = require('../lfs.js'),
    started = false;
    
// Process the startup JSON object

process.stdin.setEncoding('utf8');
process.stdin.on("data", function(data) {
    // Do the initialization bits
    var processInfo = JSON.parse(data);
    var authLib = require("../../../" + processInfo.sourceDirectory + "/auth.js");
    var syncApi = require("../../../" + processInfo.sourceDirectory + "/sync-api.js")(app);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    
    app.meData = lfs.loadMeData();
    locker.connectToMongo(function(collections) {
        require("../lapi.js")(app, processInfo.id, collections);
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