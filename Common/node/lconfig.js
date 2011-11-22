/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

//just a place for lockerd.js to populate config info
var fs = require('fs');
var path = require('path');

exports.load = function(filepath) {
    var config = {};
    try {
        config = JSON.parse(fs.readFileSync(filepath));
    } catch(err) {
        if(err.code !== 'EBADF')
            throw err;
    }
    exports.lockerHost = config.lockerHost || 'localhost';
    exports.externalHost = config.externalHost || 'localhost';
    exports.lockerPort = config.lockerPort || 8042;
    if(config.externalPort)
        exports.externalPort = config.externalPort;
    else if(config.externalSecure)
        exports.externalPort = 443;
    else
        exports.externalPort = exports.lockerPort;
    exports.externalSecure = config.externalSecure;
    exports.externalPath = config.externalPath || '';
    exports.airbrakeKey = config.airbrakeKey || undefined;
    setBase();
    exports.scannedDirs = config.scannedDirs || [
        "Apps",
        "Collections",
        "Me/github",
        "Connectors"
        ];
    exports.mongo = config.mongo || {
        "dataDir": "mongodata",
        "host": "localhost",
        "port": 27018
    };
    // FIXME: me should get resolved into an absolute path, but much of the code base uses it relatively.
    exports.me = config.me || "Me";
    // FIXME: is lockerDir the root of the code/git repo? or the dir that it starts running from? 
    // Right now it is ambiguous, we probably need two different vars
    exports.lockerDir = path.join(path.dirname(path.resolve(filepath)), "..");
    exports.logFile = config.logFile || undefined;
    exports.logFileMaxSize = config.logFileMaxSize || 256 * 1024 * 1024; // default max log file size of 64MB
    exports.ui = config.ui || 'useui';
    exports.dashboard = config.dashboard;
}

function setBase() {
    exports.lockerBase = 'http://' + exports.lockerHost +
                         (exports.lockerPort && exports.lockerPort != 80 ? ':' + exports.lockerPort : '');
    exports.externalBase = 'http';
    if(exports.externalSecure === true || (exports.externalPort == 443 && exports.externalSecure !== false))
        exports.externalBase += 's';
    exports.externalBase += '://' + exports.externalHost +
                         (exports.externalPort && exports.externalPort != 80 && exports.externalPort != 443 ? ':' + exports.externalPort : '');
    if(exports.externalPath)
        exports.externalBase += exports.externalPath;
}
