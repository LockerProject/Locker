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
  , badges = []
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
        if(err || !data || !JSON.parse(data).response.badges) return callback("broke" + err);
        //console.log(data.response)
        var badges_json = JSON.parse(data).response.badges;
        if (badges_json === undefined) {
            return callback('error attempting to get profile data - ' + data);
        }
        badges = JSON.stringify(badges_json);
        for (var badge in badges_json) {
            if (badges_json[badge]['unlocks'].length > 0){
                newBadges.push({obj: badges_json[badge], timestamp: Date.now()});
                seenIDs[badges_json[badge].id] = true;
            }
        }
        
        callback();
    });
}

function getBadges(token, callback) {
    request.get('https://api.foursquare.com/v2/users/self/badges.json?v=20111202&oauth_token=' + token, callback);
}
