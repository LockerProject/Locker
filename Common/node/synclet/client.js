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
  ;


var sync = require(process.cwd() + "/" + run.name + ".js");
sync.sync(lockerSynclet.info, function(err, returnedInfo) {
    if (err) {
        console.error("synclet returned an error: " + JSON.stringify(err));
    }
    if(!returnedInfo)
    {
        fs.writeSync(1, "{}");
    }else{
        var output = JSON.stringify(returnedInfo);
        fs.writeSync(1, output);
    }
    process.exit();
});
