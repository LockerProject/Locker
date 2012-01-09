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
    rdio.getTracksInCollection(0
                             , processInfo.auth
                             , function (track) {
                                   track.id = track.key;
                                   tracks.push({obj : track
                                              , timestamp : new Date()
                                              , type : 'new'});
                               }
                             , function (err) {
                                   if (err) console.error(err);
                                   cb(err, {data : {track : tracks}});
                               }
    );
};
