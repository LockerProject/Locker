/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/*
*
* Handles all sync logic of data from Twitter
* 
*/

var request = require('request'),
    fs = require('fs'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js'),
    EventEmitter = require('events').EventEmitter,
    dataStore = require('../../Common/node/connector/dataStore');
    
var auth, profile, latests;
var twitterClient;
var allKnownIDs;
var requestCount = 0;

exports.eventEmitter = new EventEmitter();

// Initialize the state
exports.init = function(theAuth, mongo) {
    auth = theAuth;
    try {
        latests = JSON.parse(fs.readFileSync('latests.json'));
    } catch (err) { latests = {}; }
    try {
        profile = JSON.parse(fs.readFileSync('profile.json'));
    } catch (err) { profile = {}; }
    try {
        allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
    } catch (err) { allKnownIDs = {friends:{}, followers:{}}; }
    dataStore.init('id_str', mongo);
}

// Pulls statuses from a given endpoint (home_timeline, mentions, etc via the /statuses twitter API endpoint)
exports.pullStatuses = function(type, callback) {
    if(!getTwitterClient()) {
        console.error('could not get Twitter Client');
        callback('missing auth info :(');
        return;
    }
    if(!latests[type])
        latests[type] = {};
    var items = [];
    pullTimelinePage(type, null, latests[type].latest, null, items, function() {
        items.reverse();
        var num = items.length;
        addStatuses(type, items, function() {
            callback(null, (type === 'home_timeline' ? 60 : 120), "synced "+type+" with "+num+" new entries");
        });
    });
}

function addStatuses(type, statuses, callback) {
    if(!statuses || !statuses.length) {
        callback();
        return;
    }
    var status = statuses.shift();
    dataStore.addObject(type, status, function(err) {
        var eventObj = {source:type, type:'new', status:status};
        exports.eventEmitter.emit('status/twitter', eventObj);
        // console.error('status', status);
        if(status.entities && status.entities.urls && status.entities.urls.length) {
            for(var i in status.entities.urls) {
                var eventObj = {source:type, type:'new', 
                                data:{url:status.entities.urls[i],
                                      sourceObject:status}};
                exports.eventEmitter.emit('link/twitter', eventObj);
            }
        }
        addStatuses(type, statuses, callback);
    });
    
}

// Pulls one page of a statuses endpoint
function pullTimelinePage(endpoint, max_id, since_id, page, items, callback) {
    if(!page)
        page = 1;
    var params = {token: auth.token, count: 200, page: page, include_entities:true};
    if(max_id)
        params.max_id = max_id;
    if(since_id)
        params.since_id = since_id;
    requestCount++;
    getTwitterClient().apiCall('GET', '/statuses/' + endpoint + '.json', params, function(error, result) {
        if(error) {
            if(error.statusCode >= 500) { //failz-whalez, hang out for a bit
                setTimeout(function(){
                    pullTimelinePage(endpoint, max_id, since_id, page, items, callback);
                }, 10000);
            }
            require("sys").puts( error.stack )
            console.error('error from twitter:', error);
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
                console.error('sleeping a bit...');
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


// Syncs info about friends of followers
exports.syncUsersInfo = function(friendsOrFollowers, callback) {
    if(!friendsOrFollowers || friendsOrFollowers.toLowerCase() != 'followers')
        friendsOrFollowers = 'friends';
        
    getUserInfo(function(err, newUserInfo) {
        profile = newUserInfo;
        lfs.writeObjectToFile('profile.json', profile);
        getIDs(friendsOrFollowers, profile.screen_name, function(err, ids) {
            var newIDs = [];
            var knownIDs = allKnownIDs[friendsOrFollowers];
            var repeatedIDs = {};
            if(ids) {
                ids.forEach(function(id) {
                    if(!knownIDs[id])
                        newIDs.push(id);
                    else
                        repeatedIDs[id] = 1;
                });
            }
            var removedIDs = [];
            for(var knownID in knownIDs) {
                if(!repeatedIDs[knownID])
                    removedIDs.push(knownID);
            }
            if(newIDs.length < 1) {
                if(removedIDs.length > 0) {
                    var num = removedIDs.length;
                    logRemoved(friendsOrFollowers, removedIDs, function(err) {
                        callback(null, 600, 'removed ' + num + ' ' + friendsOrFollowers);    
                    });
                }
                else {
                    callback(null, 600, 'synced 0 new ' + friendsOrFollowers);
                }
            } else {
                getUsersExtendedInfo(newIDs, function(usersInfo) {
                    var newIDCount = usersInfo.length;
                    addPeople(friendsOrFollowers, usersInfo, knownIDs, function() {
                        if(removedIDs.length > 0) {
                            var num = removedIDs.length;
                            logRemoved(friendsOrFollowers, removedIDs, function(err) {
                                callback(null, 600, 'removed ' + num + ' ' + friendsOrFollowers);    
                            });
                        } else {
                            callback(null, 600, 'synced ' + newIDCount + ' new ' + friendsOrFollowers);
                        }
                        fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
                    });
                });
            }
        });
    });
}

function addPeople(type, people, knownIDs, callback) {
    if(!people.length) {
        callback();
        return;
    }
    var person = people.shift();
    knownIDs[person.id_str] = 1;
    dataStore.addObject(type, person, function(err) {
        var eventObj = {source:type, type:'new', data:person};
        exports.eventEmitter.emit('contact/twitter', eventObj);
        addPeople(type, people, knownIDs, callback);
    });
}

function logRemoved(type, ids, callback) {
    if(!ids || !ids.length) {
        fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
        callback();
        return;
    }
    var id = ids.shift();
    var knownIDs = allKnownIDs[type];
    dataStore.removeObject(type, ""+id, function(err) {
        var eventObj = {source:type, type:'delete', data:{id:id, deleted:true}};
        exports.eventEmitter.emit('contact/twitter', eventObj);
        delete knownIDs[id];
        logRemoved(type, ids, callback);
    });
}

exports.updateProfiles = function(type, callback) {
    if(!type || type.toLowerCase() != 'followers')
        type = 'friends';
        
    var ids = [];
    for(var i in allKnownIDs[type]) {
        ids.push(i);
    }
    getUsersExtendedInfo(ids, function(usersInfo) {
        updatePeople(type, usersInfo, callback);
    });
}


function updatePeople(type, people, callback) {
    if(!people || !people.length) {
        callback();
        return;
    }
    var profileFromTwitter = people.shift();
    dataStore.getCurrent(type, profileFromTwitter.id_str, function(err, record) {
        if(err) {
            console.error('got error from dataStore.getPersonFromCurrent:', err);
        } else if(!record) {
            console.error('no record for type:', type, ' and id:', profileFromTwitter.id, '\nrecord:', record);
        } else {
            var profileFromMongo = record;
            var isDifferent = false;
            var keys = Object.keys(profileFromMongo);
            if(keys.length != Object.keys(profileFromMongo).length) {
                isDifferent = true;
            } else {
                for(var key in profileFromMongo) {
                    if(key === 'status') //don't check status
                        continue;
                    if(key !== 'status' && profileFromTwitter[key] !== profileFromMongo[key]) {
                        isDifferent = true;
                        break;
                    }
                }
            }
            if(isDifferent) {
                dataStore.addObject(type, profileFromTwitter, function(err) {
                    var eventObj = {source:type, type:'update', data:profileFromTwitter};
                    exports.eventEmitter.emit('contact/twitter', eventObj);
                    updatePeople(type, people, callback);
                });
            } else {    
                updatePeople(type, people, callback);
            }
        }
    });
}



// Syncs the profile of the auth'd user
exports.syncProfile = function(callback) {
    getUserInfo(function(err, newUserInfo) {
        profile = newUserInfo;
        lfs.writeObjectToFile('profile.json', profile);
        callback(err, newUserInfo);
    });
}

// Gets the profile of the auth'd user
function getUserInfo(callback) {
    if(!getTwitterClient())
        return;
    getTwitterClient().apiCall('GET', '/account/verify_credentials.json', 
                            {token:auth.token, include_entities:true}, callback);
}

// Gets the list of IDs of friends or followers of the auth'd user
function getIDs(friendsOrFolowers, screenName, callback) {
    if(!friendsOrFolowers || friendsOrFolowers.toLowerCase() != 'followers')
        friendsOrFolowers = 'friends';
    friendsOrFolowers = friendsOrFolowers.toLowerCase();
    getTwitterClient().apiCall('GET', '/' + friendsOrFolowers + '/ids.json', 
                    {screen_name:screenName, cursor:-1, token: auth.token}, function(err, result) {
        if(err) {
            callback(err, result);
        } else {
            callback(null, result.ids);
        }
    });
}


// Get extended profile info about the users in userIDs
function getUsersExtendedInfo(userIDs, callback) {
    _getUsersExtendedInfo(userIDs, [], callback);
}

// Recursive function to handle the fact that twitter can only
// process 100 ID's at a time
// NOTE: there is a known bug in the Twitter API here!
// Returns some duplicates and misses others
function _getUsersExtendedInfo(userIDs, usersInfo, callback) {
    if(!usersInfo)
        usersInfo = [];
    var id_str = "";
    for(var i = 0; i < 100 && userIDs.length > 0; i++) {
        id_str += userIDs.pop();
        if(i < 99) id_str += ',';
    }
    getTwitterClient().apiCall('GET', '/users/lookup.json', 
        {token: auth.token, user_id: id_str, include_entities: true},
        function(error, result) {
            if(error) {
                console.error('error! ', error);
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

// Pulls profile images for a list of users
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
        var photoExt = user.profile_image_url.substring(user.profile_image_url.lastIndexOf('.'));
        lfs.saveUrl(user.profile_image_url, 'photos/' + user.id_str + photoExt, function(success) {
            _curlNext();
        });
    }
    _curlNext();
}

// Ensures that we are always working with the same, valid and auth'd twitter client object
function getTwitterClient() {
    if(!twitterClient && auth && auth.consumerKey && auth.consumerSecret)
        twitterClient = require('./twitter_client')(auth.consumerKey, auth.consumerSecret);
    return twitterClient;
}

/** 
 *  returns object with:
 *  remaining_hits (api call remaining),
 *  hourly_limit (total allowed per hour), 
 *  reset_time (time stamp), 
 *  reset_time_in_seconds (unix time in secs)
 */
exports.getRateLimitStatus = function(callback) {
    request.get({uri:'http://api.twitter.com/1/account/rate_limit_status.json'}, function(err, resp, body) {
        var limits = JSON.parse(body);
        var remainingTime = limits.reset_time_in_seconds - (Date.now() / 1000);
        if(limits.remaining_hits)
            limits.sec_between_calls = remainingTime / limits.remaining_hits;
        else
            limits.sec_between_calls = remainingTime / 1;
        callback(limits);
    });
}

// Concatenate arrays (is the some collection methods out there?)
function addAll(target, anotherArray) {
    if(!target) 
        target = [];
    if(!anotherArray || !anotherArray.length)
        return;
    for(var i = 0; i < anotherArray.length; i++)
        target.push(anotherArray[i]);
}

// Nothing right now - will be part of calming routines
function clearCount() {
    requestCount = 0;
    setTimeout(clearCount, 3600000);
}
clearCount();