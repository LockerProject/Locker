/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// Dependencies required by our Locker App
var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    locker = require("../../Common/node/locker.js"),
    express = require('express'),
    connect = require('connect'),
    request = require("request");
    
var app = express.createServer(
    connect.bodyParser(),
    connect.cookieParser(),
    connect.session({secret : "locker"})
);

var appDataDir = process.cwd();

// This is required for every application by Locker. 
// Process the startup JSON object
process.stdin.resume();
process.stdin.on("data", function(data) {
    lockerInfo = JSON.parse(data);
    if (!lockerInfo || !lockerInfo["workingDirectory"]) {
        process.stderr.write("Was not passed valid startup information."+data+"\n");
        process.exit(1);
    }
    locker.initClient(lockerInfo);
    process.chdir(lockerInfo.workingDirectory);
    app.listen(lockerInfo.port, "localhost", function() {
        process.stdout.write(data);
    });
});


/**
 * Controller for dealing with requests to this Locker's app. The file controller will attempt to find the file you want to view and serve it up. 
 * @property req {Object} tbd
 * @property res {Objcet} tbd
 */
var fileController = function (req, res) {
    var uri = url.parse(req.url).pathname;
    if (uri === '/') uri = '/index.html'; // serve up index.html for the root of our app
    var filename = path.join(appDataDir, uri);  
    path.exists(filename, function(exists) { 
        if(!exists) {  
            res.writeHead(404, {"Content-Type": "text/plain"});  
            res.write("404 Not Found\n");  
            res.end();  
            return;  
        }  

        fs.readFile(filename, "binary", function(err, file) {  
            if(err) {  
                res.writeHead(500, {"Content-Type": "text/plain"});  
                res.write(err + "\n");  
                res.end();  
                return;  
            }  

            res.writeHead(200);  
            res.write(file, "binary");  
            res.end();  
        });  
    });
};

// Application Routing
app.get('/', fileController);
app.get('/*', fileController);
