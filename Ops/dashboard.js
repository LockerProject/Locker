/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var spawn = require('child_process').spawn;
var lconfig = require('../Common/node/lconfig.js');
var dashboard;

lconfig.load('config.json');
exports.instance = dashboard;

exports.start = function(port) {
    // start dashboard
    dashboard  = spawn('node', ['dashboard-client.js', lconfig.lockerHost, lconfig.lockerPort, port, lconfig.externalBase],
                            {cwd: __dirname + '/Dashboard'});
    dashboard.uriLocal = 'http://' + lconfig.lockerHost + ':' + port;
    dashboard.port = port;
    console.log('Spawned dashboard pid: ' + dashboard.pid);
    dashboard.stdout.on('data',function (data){
    console.log('dashboard stdout: '+data);
    });
    dashboard.stderr.on('data',function (data){
        console.log('Error dashboard: '+data);
    });
    dashboard.on('exit', function (code) {
      if(code > 0) console.log('dashboard died with code ' + code);
    });
    exports.instance = dashboard;
}

