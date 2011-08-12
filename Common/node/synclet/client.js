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
        console.error("failed to run: "+E);
    }
});

var path = require('path');
function run (processInfo) {
    require.paths.unshift(".");
    var sync = require(processInfo.name);
    process.chdir(processInfo.workingDirectory);
console.error("running "+processInfo.name);
    sync.sync(processInfo, function(err, returnedInfo) {
        if (err) {
            fs.writeSync(1,JSON.stringify(err));
        } else {
            fs.writeSync(1,JSON.stringify(returnedInfo));
        }
        process.exit();
    });
}
process.stdin.resume();
