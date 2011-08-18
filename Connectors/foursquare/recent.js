/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs')
  , request = require('request')
  , auth
  , seenIDs = {}
  , recents = []
  , lastCheckins = {}
  , newRecents = []
  ;

exports.sync = function(processInfo, cb) {
    auth = processInfo.auth;
    if (processInfo.config && processInfo.config.recents) {
        lastCheckins = processInfo.config.recents;
    }
    exports.syncRecent(function(err) {
        var responseObj = {data : {}, config : {}};
        responseObj.data.recents = newRecents;
        responseObj.config.recents = seenIDs;
        cb(err, responseObj);
    });
};


exports.syncRecent = function (callback) {
    getRecent(auth.accessToken, function(err, resp, data) {
        if(err || !data || !JSON.parse(data).response.recent) return callback("broke" + err);
        var checkins = JSON.parse(data).response.recent;
        if (!checkins || checkins.length == 0) {
            return callback();
        }
        recents = JSON.stringify(checkins);
        for(var i = 0; i < checkins.length; i++) {
            if (lastCheckins[checkins[i].id]) break;
            newRecents.push({obj: checkins[i], timestamp: Date.now()});
            seenIDs[checkins[i].id] = true;
        }
        callback();
    });
}

function getRecent(token, callback) {
    request.get({uri:'https://api.foursquare.com/v2/checkins/recent.json?limit=100&oauth_token=' + token}, callback);
}