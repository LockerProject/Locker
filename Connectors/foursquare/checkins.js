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
  , updateState, auth
  , places = []
  , photos = []
  , profile = []
  , checkins_limit = 250
  ;

exports.sync = function(processInfo, cb) {
    auth = processInfo.auth;
    if (processInfo.config && processInfo.config.updateState) {
        updateState = processInfo.config.updateState;
    } else {
        updateState = {checkins:{syncedThrough:0}}; }
    syncCheckins(function(err) {
        var responseObj = {data : {}, config : {}};
        responseObj.data.checkin = places;
        responseObj.data.photo = photos;
        responseObj.data.profile = [{ obj: profile }];
        responseObj.config.updateState = updateState;
        cb(err, responseObj);
    });
};

var syncCheckins = function (callback) {
    getMe(auth.accessToken, function(err, resp, data) {
        profile = JSON.parse(data).response.user;
        if (profile === undefined) {
            return callback('error attempting to get profile data - ' + data);
        }
        getCheckins(profile.id, auth.accessToken, 0, function(err, checkins) {
            if (!checkins || !checkins.length) {
                return callback();
            }
            for (var i = 0; i < checkins.length; i++) {
                var checkin = checkins[i];
                if (checkins[i].photos.count > 0) {
                    for (var j = 0; j < checkins[i].photos.count; j++) {
                        downloadPhoto(checkins[i].photos.items[0].url, checkin.id + "_" + j);
                    }
                }
                places.push({obj: checkin, type: 'new', timestamp: new Date()});
            }
            callback();
        });
    });
}


function getCheckins(userID, token, offset, callback, checkins) {
    if(!checkins)
        checkins = [];
    var latest = 1;
    if(updateState.checkins && updateState.checkins.syncedThrough)
        latest = updateState.checkins.syncedThrough;
    request.get({uri:'https://api.foursquare.com/v2/users/self/checkins.json?limit=' + checkins_limit + '&offset=' + offset +
                                                            '&oauth_token=' + token + '&afterTimestamp=' + latest},
    function(err, resp, data) {
        var response = JSON.parse(data).response;
        if(!(response.checkins && response.checkins.items)) { //we got nothing
            if(checkins.length > 0)
                updateState.checkins.syncedThrough = checkins[0].createdAt;
            return callback(err, checkins.reverse());
        }
        var newCheckins = response.checkins.items;
        addAll(checkins, newCheckins);
        if(newCheckins && newCheckins.length == checkins_limit)
            getCheckins(userID, token, offset + checkins_limit, callback, checkins);
        else {
            if (checkins[0])
                updateState.checkins.syncedThrough = checkins[0].createdAt;
            callback(err, checkins.reverse());
        }
    });
}

function downloadPhoto(url, id) {
    request.get({uri:url, encoding: 'binary'}, function(err, resp, body) {
        if (err)
            console.error(err);
        else {
            fs.writeFileSync('photos/' + id + '.jpg', body, 'binary');
            photos.push({'obj' : {'photoID' : id}});
        }
    });
}

function getMe(token, callback) {
    request.get({uri:'https://api.foursquare.com/v2/users/self.json?oauth_token=' + token}, callback);
}

function addAll(thisArray, anotherArray) {
    if(!(thisArray && anotherArray && anotherArray.length))
        return;
    for(var i = 0; i < anotherArray.length; i++)
        thisArray.push(anotherArray[i]);
}
