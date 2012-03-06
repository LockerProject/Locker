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
    if (path.existsSync(filepath))
        config = JSON.parse(fs.readFileSync(filepath));

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
    exports.requireSigned = config.hasOwnProperty('requireSigned') ? config.requireSigned : true;
    exports.externalPath = config.externalPath || '';
    exports.airbrakeKey = config.airbrakeKey || undefined;
    exports.stats = config.stats || {};
    if (exports.stats.prefix) {
        var hostname = process.env['HOSTNAME']
          , hostBasename;

        if (!hostname) hostBasename = 'localhost';
        else hostBasename = hostname.split('.')[0];

        exports.stats.prefix += '.' + hostBasename;
    }
    setBase();
    exports.registryUpdateInterval = config.registryUpdateInterval || 3600;
    exports.collections = config.collections || [
        "contacts:Collections/Contacts",
        "links:Collections/Links",
        "photos:Collections/Photos",
        "places:Collections/Places",
        "search:Collections/Search"
    ];
    exports.apps = config.apps || [
        "helloplaces:Apps/HelloPlaces",
        "linkalatte:Apps/LinkaLatte",
        "contactsviewer:Apps/MergedContacts",
        "devdocs:Apps/DevDocs",
        "photosviewer:Apps/PhotosViewer",
        "facebook:Connectors/Facebook",
        "flickr:Connectors/Flickr",
        "github:Connectors/GitHub",
        "gcontacts:Connectors/GoogleContacts",
        "instagram:Connectors/Instagram",
        "twitter:Connectors/Twitter",
        "foursquare:Connectors/foursquare"
    ];
    config.mongo = config.mongo || {};
    exports.mongo = {
        "dataDir": config.mongo.dataDir || "mongodata",
        "host": config.mongo.host || "localhost",
        "port": config.mongo.port || 27018,
        "options": config.mongo.options || ['--nohttpinterface']
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
    exports.ui = config.ui || 'dashboardv3:Apps/dashboardv3';
    exports.quiesce = (config.quiesce || 650) * 1000;

    config.dashboard = config.dashboard || {};
    config.dashboard.lockerName = config.dashboard.customLockerName || 'locker';
    exports.dashboard = config.dashboard;

    // load trusted public keys
    var kdir = path.join(path.dirname(filepath), "keys");
    exports.keys = [];
    if(path.existsSync(kdir))
    {
        var keys = fs.readdirSync(kdir);
        keys.forEach(function(key){
            if(key.indexOf(".pub") == -1) return;
            exports.keys.push(fs.readFileSync(path.join(kdir, key)).toString());
        });
    }
};

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
