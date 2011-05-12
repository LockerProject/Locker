/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/**
 * web server/service to wrap interactions w/ FB open graph
 */

var express = require('express'),
    connect = require('connect'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js'),
    authLib = require('./auth');

var app = express.createServer(connect.bodyParser());

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    // Do the initialization bits
    var processInfo = JSON.parse(chunk);
   	// TODO:  Is there validation to do here?
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    
    // We're adding this info to app for basic utility use
    app.meData = lfs.loadMeData();
    // Adds the internal API to the app because it should always be available
   require(__dirname + "/api.js")(app);
    // If we're not authed, we add the auth routes, otherwise add the webservice
    authLib.authAndRun(app, function() {
        auth = authLib.auth;
        require(__dirname + "/webservice.js")(app, authLib.auth);
    });
    
    // Start the core web server
    app.listen(processInfo.port,function(){
		// Tell the locker core that we're done
        var returnedInfo = {port: processInfo.port};
        process.stdout.write(JSON.stringify(returnedInfo));
    });
});
