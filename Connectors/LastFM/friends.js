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
    var friends = [];

    var lastfm = require(path.join(processInfo.absoluteSrcdir, 'lib.js'));
    lastfm.getFriends(processInfo,
        function (friend) {
          friends.push(friend);
        },
        function (err, config) {
          if (err) {
            console.error(err);
            cb(err);
          } else {
            cb(null, {config: config, data : {friend : friends}});
          }
        }
    );
};
