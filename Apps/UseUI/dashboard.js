/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    process.chdir(processInfo.workingDirectory);
    var extBase = processInfo.externalBase.substring(0, processInfo.externalBase.indexOf('/Me/useui'));
    require('./dashboard-client')(extBase, processInfo.port);
    process.stdout.write(JSON.stringify({port: processInfo.port}));
});
stdin.resume();