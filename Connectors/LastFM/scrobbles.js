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
  var lastfm = require(path.join(processInfo.absoluteSrcdir, 'lib.js'));
  var scrobbles = [];


  if (!processInfo.config) processInfo.config = {};
  if (!processInfo.config.playcount) processInfo.config.playcount = 0;

  // Here we let it run from current and see if we're up to the correct play count
  var params = {};
  if (processInfo.config && processInfo.config.lastplayed) {
    params.from = processInfo.config.lastplayed;
  }
  lastfm.getScrobbles(processInfo, params, function (play) {
    if (play && play.date && play.date.uts) play.id = play.date.uts;
    scrobbles.push(play);
  }, function (err, config) {
    if (err) {
      console.error("Error! %s", err);
      cb(err);
    } else {
      // Let's start tracking the last played time from this point on.
      if (config.nextRun >= 0) {
        config.lastplayed = parseInt(Date.now() / 1000);
      }
      cb(null, {config: config, data : {scrobble : scrobbles}});
    }
  });
};
