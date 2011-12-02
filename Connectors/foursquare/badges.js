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
  , lastBadges = {}
  , newBadges = []
  ;

exports.sync = function(processInfo, cb) {
    auth = processInfo.auth;
    if (processInfo.config && processInfo.config.badges) {
        lastBadges = processInfo.config.badges;
    }
    exports.syncBadges(function(err) {
        var responseObj = {data : {}, config : {}};
        responseObj.data.badges = newBadges;
        responseObj.config.badges = seenIDs;
        cb(err, responseObj);
    });
};


exports.syncBadges = function (callback) {
    getBadges(auth.accessToken, function(err, resp, data) {
        console.log(data);
        //console.log(resp);
        if(err || !data || !JSON.parse(data).response.badges) return callback("broke" + err);
        var badges = JSON.parse(data).response.badges;
        //console.log(data);
        //console.log(data);
        if (badges === undefined) {
            return callback('error attempting to get profile data - ' + data);
        }
        if (!badges || badges.length == 0) {
            return callback();
        }
        for(var i = 0; i < badges.length; i++) {
            console.log(badges[i]);
            if (lastBadges[badges[i].id]) break;
            newBadges.push({obj: badges[i], timestamp: Date.now()});
            seenIDs[badges[i].id] = true;
        }
        callback();
    });
}

function getBadges(token, callback) {
    request.get({uri:'https://api.foursquare.com/v2/users/self/badges?v=20111202&oauth_token=' + token}, callback);
}
