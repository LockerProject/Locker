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
process.stdin.on("data", function(data) {
    // Do the initialization bits
    var processInfo = JSON.parse(data);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    
    app.meData = lfs.loadMeData();
    // Adds the internal API to the app because it should always be available
    require(__dirname + "/api.js")(app);
    // If we're not authed, we add the auth routes, otherwise add the webservice
    authLib.authAndRun(app, syncApi.authComplete);
    
    app.listen(processInfo.port, "localhost", function() {
        process.stdout.write(data);
    });
});
process.stdin.resume();
