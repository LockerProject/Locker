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
    app,
    locker = require('../locker.js'),
    lfs = require('../lfs.js'),
    started = false;
    
// Process the startup JSON object

process.stdin.setEncoding('utf8');
process.stdin.on("data", function(data) {
    // Do the initialization bits
    var processInfo = JSON.parse(data);
    var processOptions = processInfo.processOptions;
    if (processOptions.enableCookies) {
        app = express.createServer(
              connect.bodyParser(),
              connect.cookieParser(),
              connect.session({secret : "locker"}) );
    } else {
        app = express.createServer(connect.bodyParser());
    }
    var mongoId = processOptions.id || "id";
    var authLib = undefined;
    if (processOptions.oauth2) {
        authLib = require('./oauth2.js');
        authLib.options = processOptions.oauth2;
    } else {
        authLib = require("../../../" + processInfo.sourceDirectory + "/auth.js");
    }
    var syncApi = require("../../../" + processInfo.sourceDirectory + "/sync-api.js")(app);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    
    app.meData = lfs.loadMeData();
    locker.connectToMongo(function(collections) {
        require("./api.js")(app, mongoId, collections);
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