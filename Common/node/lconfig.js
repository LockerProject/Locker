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

exports.lockerHost = 'localhost';
exports.externalHost = 'localhost';
exports.lockerPort = 8042;
exports.externalPort = 8042;
exports.externalPath = '';
exports.externalSecure = false;
setBase();
exports.lockerDir = process.cwd();

exports.load = function(filepath) {
    var config = JSON.parse(fs.readFileSync(filepath));
    exports.lockerHost = config.lockerHost || 'localhost';
    exports.externalHost = config.externalHost || 'localhost';
    exports.lockerPort = config.lockerPort || 8042;
    exports.externalPort = config.externalPort || exports.lockerPort;
    exports.externalSecure = config.externalSecure;
    exports.externalPath = config.externalPath;
    setBase();
    exports.scannedDirs = config.scannedDirs;
    exports.mongo = config.mongo;
    exports.me = config.me;
    exports.lockerDir = process.cwd();
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
