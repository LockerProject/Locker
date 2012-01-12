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

var tracks = [];

exports.sync = function (processInfo, cb) {
    rdio.getTracksInCollection(processInfo
                             , function (track) {
                                   tracks.push(track);
                               }
                             , function (err, config) {
                                   if (err) {
                                       console.error(err);
                                       cb(err);
                                   }
                                   else {
                                       cb(null, {config : config, data : {track : tracks}});
                                   }
                               }
    );
};
