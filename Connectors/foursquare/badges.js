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
  , Badgess = []
  , lastBadges = {}
  , newBadges = []
  ;

exports.sync = function(processInfo, cb) {
    auth = processInfo.auth;
    if (processInfo.config && processInfo.config.Badgess) {
        lastBadges = processInfo.config.Badgess;
    }
    exports.syncBadges(function(err) {
        var responseObj = {data : {}, config : {}};
        responseObj.data.Badges = newBadges;
        responseObj.config.Badges = seenIDs;
        cb(err, responseObj);
    });
};


exports.syncBadges = function (callback) {
    getBadges(auth.accessToken, function(err, resp, data) {
        if(err || !data || !JSON.parse(data).response.badges) return callback("broke" + err);
        var badges = JSON.parse(data).response.badges;
        if (badges === undefined) {
            return callback('error attempting to get profile data - ' + data);
        }
        if (!badges || badges.length == 0) {
            return callback();
        }
        badges = JSON.stringify(badges);
        for(var i = 0; i < badges.length; i++) {
            if (lastBadges[badges[i].id]) break;
            newBadges.push({obj: badges[i], timestamp: Date.now()});
            seenIDs[badges[i].id] = true;
        }
        callback();
    });
}

function getBadges(token, callback) {
    request.get({uri:'https://api.foursquare.com/v2/users/self/badges?oauth_token=' + token}, callback);
}
