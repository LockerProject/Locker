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
    var tracks = [];

    // Disabled for now, until we can find a better request pattern
    return cb(null, {config:{nextRun:99999999999}, data:{track:[]}});
    /*
    var lastfm = require(path.join(processInfo.absoluteSrcdir, 'lib.js'));
    lastfm.getLibrary(processInfo
                    , function (track) {
                          track.id = lastfm.createId(track);
                          tracks.push(track);
                      }
                    , function (err, config) {
                          if (err) {
                              console.error(err);
                              cb(err);
                          }
                          else {
                              cb(null, {config: config, data : {track : tracks}});
                          }
                      }
    );
    */
};
