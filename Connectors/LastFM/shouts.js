/*
 *
 * Copyright (C) 2012, The Locker Project
 * All rights reserved.
 *
 * Please see the LICENSE file for more information.
 *
 */

var path   = require('path')
  , lastfm = require(path.join(__dirname, 'lib.js'));

exports.sync = function (processInfo, cb) {
    var shouts = [];

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
