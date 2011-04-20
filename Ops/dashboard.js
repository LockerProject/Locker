/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var spawn = require('child_process').spawn;

var dashboard;

exports.instance = dashboard;

exports.start = function(port) {
    // start dashboard
    dashboard  = spawn('node', ['dashboard-client.js', "localhost", port], {cwd: 'Ops/Dashboard'});
    dashboard.uriLocal = "http://localhost:"+port+"/";
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

