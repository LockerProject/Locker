/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var spawn = require('child_process').spawn;
var logger = require(__dirname + '/../Common/node/logger').logger;
var thswitch;
exports.instance = thswitch;

exports.start = function() {
    // start dashboard
    thswitch  = spawn('node', ['switch.js'],
                            {cwd: __dirname + '/TeleHash'});
    logger.info('Spawned TeleHash switch pid: ' + thswitch.pid);
    thswitch.stdout.on('data',function (data){
    });
    thswitch.stderr.on('data',function (data){
        logger.error('Error TeleHash: '+data);
    });
    thswitch.on('exit', function (code) {
      if(code > 0) logger.info('TeleHash died with code ' + code);
    });
    exports.instance = thswitch;
}

