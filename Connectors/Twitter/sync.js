/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require('request'),
    fs = require('fs'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');
    
var auth, userInfo, latests;

exports.init = function(theAuth) {
    auth = theAuth;
    try {
        latests = JSON.parse(fs.readFileSync('latests.json'));
    } catch (err) { latests = {}; }
    try {
        userInfo = JSON.parse(fs.readFileSync('userInfo.json'));
    } catch (err) { userInfo = {}; }
}


exports.pullStatuses = function(endpoint, repeatAfter, callback) {
    if(!getTwitterClient()) {
        sys.debug('could not get twitterClient');
        callback('missing auth info :(');
        return;
    }
    if(!latests[endpoint])
        latests[endpoint] = {};
    var items = [];
    pullTimelinePage(endpoint, null, latests[endpoint].latest, null, items, function() {
        items.reverse();
        lfs.appendObjectsToFile(endpoint + '.json', items);
        locker.at(endpoint, repeatAfter);
        locker.diary("sync'd "+endpoint+" with "+items.length+" new entries");
        callback();
    });
}

function pullTimelinePage(endpoint, max_id, since_id, page, items, callback) {
    if(!page)
        page = 1;
    var params = {token: auth.token, count: 200, page: page, include_entities:true};
    if(max_id)
        params.max_id = max_id;
    if(since_id)
        params.since_id = since_id;
    requestCount++;
    twitterClient.apiCall('GET', '/statuses/' + endpoint + '.json', params, function(error, result) {
        if(error) {
            if(error.statusCode >= 500) { //failz-whalez, hang out for a bit
                setTimeout(function(){pullTimelinePage(endpoint, max_id, since_id, page, items, callback);}, 10000);
            }
            sys.debug('error from twitter:' + sys.inspect(error));
            return;
        }
        if(result.length > 0) {
            var id = result[0].id;
            if(!latests[endpoint].latest || id > latests[endpoint].latest)
                latests[endpoint].latest = id;
            for(var i = 0; i < result.length; i++)
                items.push(result[i]);

            if(!max_id)
                max_id = result[0].id;
            page++;
            if(requestCount > 300) {
                sys.debug('sleeping a bit...');
                setTimeout(function() {
                    pullTimelinePage(endpoint, max_id, since_id, page, items, callback);
                }, 30000);
            } else {
                pullTimelinePage(endpoint, max_id, since_id, page, items, callback);
            }
        } else if(callback) {
            lfs.writeObjectToFile('latests.json', latests);
            callback();
        }
    });
}


exports.syncUsersInfo = function(friendsOrFollowers, callback) {
    if(!friendsOrFollowers || friendsOrFollowers.toLowerCase() != 'followers')
        friendsOrFollowers = 'friends';
        
    getUserInfo(function(err, newUserInfo) {
        userInfo = newUserInfo;
        lfs.writeObjectToFile('usersInfo.json', userInfo);
        getIDs(friendsOrFollowers, userInfo.screen_name, function(err, ids) {
            if(!ids || ids.length < 1) {
                locker.at('/' + friendsOrFollowers, 3600);
                callback();
            } else {
                getUsersExtendedInfo(ids, function(usersInfo) {
                    locker.diary('got ' + usersInfo.length + ' ' + friendsOrFollowers);
                    lfs.writeObjectsToFile(friendsOrFollowers + '.json', usersInfo);
                    locker.at('/' + friendsOrFollowers, 3600);
                    callback();
                });
            }
        });
    });
}

exports.syncProfile = function(callback) {
    getUserInfo(function(err, newUserInfo) {
        userInfo = newUserInfo;
        lfs.writeObjectToFile('userInfo.json', userInfo);
        callback(err, newUserInfo);
    });
}

function getUserInfo(callback) {
    if(!getTwitterClient())
        return;
    twitterClient.apiCall('GET', '/account/verify_credentials.json', {token:auth.token, include_entities:true}, callback);
}

function getIDs(friendsOrFolowers, screenName, callback) {
    if(!friendsOrFolowers || friendsOrFolowers.toLowerCase() != 'followers')
        friendsOrFolowers = 'friends';
    friendsOrFolowers = friendsOrFolowers.toLowerCase();
    twitterClient.apiCall('GET', '/' + friendsOrFolowers + '/ids.json', 
                    {screen_name:screenName, cursor:-1, token: auth.token}, function(err, result) {
        if(err) {
            callback(err, result);
        } else {
            callback(null, result.ids);
        }
    });
}

function getUsersExtendedInfo(userIDs, callback) {
    _getUsersExtendedInfo(userIDs, [], callback);
}

function _getUsersExtendedInfo(userIDs, usersInfo, callback) {
    if(!usersInfo)
        usersInfo = [];
    var id_str = "";
    for(var i = 0; i < 100 && userIDs.length > 0; i++) {
        id_str += userIDs.pop();
        if(i < 99) id_str += ',';
    }
    twitterClient.apiCall('GET', '/users/lookup.json', {token: auth.token, user_id: id_str, include_entities: true},
        function(error, result) {
            if(error) {
                sys.debug('error! ' + JSON.stringify(error));
                return;
            }
            addAll(usersInfo, result.reverse());
            if(userIDs.length > 0) 
                _getUsersExtendedInfo(userIDs, usersInfo, callback);
            else if(callback) {
                getPhotos(usersInfo);
                callback(usersInfo);
            }
        });
}

function getPhotos(users) {
    try {
        fs.mkdirSync('photos', 0755);
    } catch(err) {
    }
    var userz = [];
    for(var i in users)
        userz.push(users[i]);
    
    function _curlNext() {
        var user = userz.pop();
        if(!user)
            return;
        var photoExt = user.profile_image_url.substring(user.profile_image_url.lastIndexOf('/')+1);
        lfs.curlFile(user.profile_image_url, 'photos/' + user.id_str + photoExt, function(success) {
            _curlNext();
        });
    }
    _curlNext();
}


var twitterClient;
function getTwitterClient() {
    if(!twitterClient && auth && auth.consumerKey && auth.consumerSecret)
        twitterClient = require('./twitter_client')(auth.consumerKey, auth.consumerSecret);
    return twitterClient;
}

/** returns object with:
 *  remaining_hits (api call remaining),
 *  hourly_limit (total allowed per hour), 
 *  reset_time (time stamp), 
 *  reset_time_in_seconds (unix time in secs)
 */
exports.getRateLimitStatus = function(callback) {
    request.get({uri:'http://api.twitter.com/1/account/rate_limit_status.json'}, function(err, resp, body) {
        var limits = JSON.parse(body);
        var remainingTime = limits.reset_time_in_seconds - (new Date().getTime() / 1000);
        if(limits.remaining_hits)
            limits.sec_between_calls = remainingTime / limits.remaining_hits;
        else
            limits.sec_between_calls = remainingTime / 1;
        callback(limits);
    });
}

function addAll(target, anotherArray) {
    if(!target) 
        target = [];
    if(!anotherArray || !anotherArray.length)
        return;
    for(var i = 0; i < anotherArray.length; i++)
        target.push(anotherArray[i]);
}

function clearCount() {
    requestCount = 0;
    setTimeout(clearCount, 3600000);
}
clearCount();