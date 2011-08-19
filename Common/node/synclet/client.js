/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs')
  , data = ''
  , failTimeout = ''
  ;

// Process the startup JSON object
process.stdin.setEncoding('utf8');
process.stdin.on("data", function(newData) {
    // Do the initialization bits
    data += newData;
    try {
        run(JSON.parse(data));
    } catch (E) {
        failTimeout = setTimeout(function() { fail(E); }, 15000);
    }
});

function run (processInfo) {
    clearTimeout(failTimeout);
    var run = processInfo.syncletToRun;
    var sync = require(process.cwd()+"/"+run.name+".js");
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

function fail(e) {
    console.error('synclet parsing of stdin failed - ' + e)
    process.exit();
}

process.stdin.resume();