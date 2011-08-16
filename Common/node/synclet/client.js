/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs')
  , data = '';
  ;

// Process the startup JSON object
process.stdin.setEncoding('utf8');
process.stdin.on("data", function(newData) {
    // Do the initialization bits
    data += newData;
    try {
        run(JSON.parse(data));
    } catch (E) {
        console.error("synclet run failed: "+E);
    }
});

function run (processInfo) {
    var run = processInfo.syncletToRun;
    require.paths.unshift("."); // not sure why?
    var sync = require(run.name);
    process.chdir(run.workingDirectory);
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
}
process.stdin.resume();