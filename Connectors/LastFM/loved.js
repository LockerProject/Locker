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
    var loved = [];

    var lastfm = require(path.join(processInfo.absoluteSrcdir, 'lib.js'));
    lastfm.getLovedTracks(processInfo
                        , function (track) {
                              track.id = track.date.uts;
                              loved.push(track);
                          }
                        , function (err, config) {
                              if (err) {
                                  console.error(err);
                                  cb(err);
                              }
                              else {
                                  cb(null, {config: config, data : {loved : loved}});
                              }
                          }
    );
};
