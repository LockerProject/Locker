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
var os = require('os');

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
    exports.lockerListenIP = config.lockerListenIP || '0.0.0.0';
    exports.lockerPort = config.lockerPort || 8042;
    if(config.externalPort)
        exports.externalPort = config.externalPort;
    else if(config.externalSecure)
        exports.externalPort = 443;
    else
        exports.externalPort = exports.lockerPort;
    exports.externalSecure = config.externalSecure;
    exports.registryUpdate = config.hasOwnProperty('registryUpdate') ? config.registryUpdate : true;
    exports.externalPath = config.externalPath || '';
    exports.airbrakeKey = config.airbrakeKey || undefined;
    setBase();
    exports.collections = config.collections || ['contacts', 'links', 'photos', 'places', 'search'];
    exports.apps = config.apps || ["contactsviewer", "photosv09", "photosviewer", "linkalatte", "helloplaces", "devdocs"];
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
    if(!config.logging) config.logging = {};
    exports.logging =  {
        file: config.logging.file || undefined,
        level:config.logging.level || "info",
        maxsize: config.logging.maxsize || 256 * 1024 * 1024, // default max log file size of 64MBB
        console: (config.logging.hasOwnProperty('console')? config.logging.console : true)
    };
    if(!config.tolerance) config.tolerance = {};
    exports.tolerance =  {
        threshold: config.tolerance.threshold || 50, // how many new/updated items
        maxstep: config.tolerance.maxstep || 10, // what is the largest frequency multiplier
        idle: 600 // flush any synclets in tolerance when dashboard activity after this many seconds of none
    };
//    exports.ui = config.ui || 'dashboardv3:Apps/dashboardv3';
    exports.ui = config.ui || 'dashboardv3';
    exports.quiesce = config.quiesce || 650000;
    exports.dashboard = config.dashboard;
    exports.workWarn = config.workWarn || os.cpus().length;
    exports.workStop = config.workStop || os.cpus().length * 3;
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
