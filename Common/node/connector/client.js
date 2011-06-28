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
    locker = require('locker'),
    lfs = require('lfs');

// run callback to pass the express app object right before the listen() happens
exports.init = function (processOptions, callback) {
    var started = false;
    var app;
    if(!processOptions) processOptions = {};

    // Process the startup JSON object
    process.stdin.setEncoding('utf8');
    process.stdin.on("data", function(data) {
        // Do the initialization bits
        var processInfo = JSON.parse(data);
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
            authLib = require('connector/oauth2');
            authLib.options = processOptions.oauth2;
        } else {
            authLib = require("auth.js");
        }
        var syncApi = require("sync-api.js")(app);
        locker.initClient(processInfo);
        process.chdir(processInfo.workingDirectory);

        app.meData = lfs.loadMeData();
        locker.connectToMongo(function(mongo) {
            require("connector/api")(app, mongoId, mongo);
            app.externalBase = processInfo.externalBase;
            authLib.authAndRun(app, processInfo.externalBase, function() {
                syncApi.authComplete(authLib.auth, mongo);
                if (!started) {
                    startWebServer();
                }
            });
            if(!authLib.isAuthed())
                startWebServer();

            function startWebServer() {
                started = true;
                // Start the core web server
                if(callback) callback(app);
                app.listen(0, function() {
                    // Tell the locker core that we're done
                    var returnedInfo = {port: app.address().port};
                    process.stdout.write(JSON.stringify(returnedInfo));
                });
            }
        })
    });
    process.stdin.resume();
}
