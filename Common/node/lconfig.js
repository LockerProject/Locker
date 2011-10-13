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
    exports.me = config.me || "Me";
    exports.lockerDir = process.cwd();
    exports.logFile = config.logFile || undefined;
    exports.ui = config.ui || 'devdashboard';
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
