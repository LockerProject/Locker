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

var updates = [];

exports.sync = function (processInfo, cb) {
    rdio.getActivityStream(processInfo
                         , function (update) {
                               update.id = update.date;
                               updates.push({obj : update
                                          , timestamp : Date.now()
                                          , type : 'new'});
                           }
                         , function (err, config) {
                               if (err) {
                                   console.error(err);
                                   cb(err);
                               }
                               else {
                                   cb(null, {config : config, data : {update : updates}});
                               }
                           }
    );
};
