/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var locker = require('locker');
var path = require('path');
var compileScript = path.join(__dirname, 'static', 'common', 'templates', 'compile.sh');

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    
    if(process.env.NODE_ENV === 'production') return start(processInfo);
    
    // if in development compile templates for easier dev-ing
    return compileTemplates(function(err) {
        start(processInfo);
    });
});
stdin.resume();

function start(processInfo) {
    process.chdir(processInfo.workingDirectory);
    var extBase = processInfo.externalBase.substring(0, processInfo.externalBase.indexOf('/Me/useui'));
    require('./dashboard-client')(locker, extBase, processInfo.port, function() {
        process.stdout.write(JSON.stringify({port: processInfo.port}));
    });
}

function compileTemplates(callback) {
    var compile = require('child_process').spawn(compileScript);
    compile.stderr.on('data', console.error);
    return compile.on('exit', callback);
}