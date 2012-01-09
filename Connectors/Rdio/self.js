/*
 *
 * Copyright (C) 2012, The Locker Project
 * All rights reserved.
 *
 * Please see the LICENSE file for more information.
 *
 */

var path = require('path')
  , rdio = require(path.join(__dirname, 'lib.js'));

var self = {};

exports.sync = function (processInfo, cb) {
    rdio.getSelf(processInfo.auth
               , function (me) {
                     self = me;
                     self.id = self.key;
                 }
               , function (err) {
                     if (err) console.error(err);
                     cb(err, {data : {profile : [{obj : self}]}});
                 }
    );
};
