/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs');

// Process the startup JSON object
process.stdin.setEncoding('utf8');
process.stdin.on("data", function(data) {
    // Do the initialization bits
    var processInfo = JSON.parse(data);
    var run = processInfo.syncletToRun;
    var sync = require(run.name + ".js");
    sync.sync(processInfo, function(err, returnedInfo) {
        if (err) {
            var error = JSON.stringify(err);
            fs.writeSync(1, error);
        } else {
            var output = JSON.stringify(returnedInfo);
            fs.writeSync(1, output);
        }
        process.exit();
    });
});
process.stdin.resume();
