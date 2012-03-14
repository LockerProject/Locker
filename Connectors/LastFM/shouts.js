/*
 *
 * Copyright (C) 2012, The Locker Project
 * All rights reserved.
 *
 * Please see the LICENSE file for more information.
 *
 */

var path   = require('path');

exports.sync = function (processInfo, cb) {
    var shouts = [];

    var lastfm = require(path.join(processInfo.absoluteSrcdir, 'lib.js'));
    lastfm.getShouts(processInfo
                   , function (shout) {
                         shouts.push(shout);
                     }
                   , function (err, config) {
                         if (err) {
                             console.error(err);
                             cb(err);
                         }
                         else {
                             cb(null, {config: config, data : {shout : shouts}});
                         }
                     }
    );
};
