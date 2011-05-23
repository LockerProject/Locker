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
* Handles all sync logic of data from Facebook
* 
*/

var request = require('request'),
    fs = require('fs'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js'),
    EventEmitter = require('events').EventEmitter;
    dataStore = require('./dataStore');
    
var auth, userInfo, latests;
var facebookClient;
var allKnownIDs;
var requestCount = 0;

exports.eventEmitter = new EventEmitter();

// Initialize the state
exports.init = function(theAuth, callback) {
    auth = theAuth;
    try {
        latests = JSON.parse(fs.readFileSync('latests.json'));
    } catch (err) { latests = {}; }
    try {
        userInfo = JSON.parse(fs.readFileSync('userInfo.json'));
    } catch (err) { userInfo = {}; }
    try {
        allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
    } catch (err) { allKnownIDs = {}; }
    dataStore.init(function() {
        callback();
    });
}

// Syncs info about friends
exports.syncUsersInfo = function(callback) {
 
    getUserInfo(function(err, newUserInfo) {
        userInfo = newUserInfo;
        lfs.writeObjectToFile('usersInfo.json', userInfo);
        getIDs(userInfo.screen_name, function(err, ids) {
            // console.error('got ids:', ids);
            var newIDs = [];
            var knownIDs = allKnownIDs;
            var repeatedIDs = {};
            if(ids) {
                ids.forEach(function(id) {
                    if(!knownIDs[id]) {
                        newIDs.push(id);
                    } else {
                        repeatedIDs[id] = 1;
                    }
                });
            }
            var removedIDs = [];
            for(var knownID in knownIDs) {
                if(!repeatedIDs[knownID]) {
                    removedIDs.push(knownID);
                }
            }
            // console.error('got new ids:', newIDs);
            // console.error('got removedIDs:', removedIDs);
            if(newIDs.length < 1) {
                if(removedIDs.length > 0) {
                    logRemoved(removedIDs);
                }
                callback();
            } else {
                getUsersExtendedInfo(newIDs, function(usersInfo) {
                    addPeople(usersInfo, knownIDs);
                    if(removedIDs.length > 0)
                        logRemoved(removedIDs);
                    fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
                    locker.diary('synced ' + usersInfo.length + ' new friends');
                    callback();
                });
            }
            locker.at('/getNew/friends', 600);
        });
    });
}

function updatePeople(people) {
    if(!people)
        return;
    people.forEach(function(profileFromFacebook) {
        dataStore.getPersonFromCurrent(profileFromFacebook.id, function(err, records) {
            if(err) {
                console.error('got error from dataStore.getPersonFromCurrent:', err);
            } else if(!records) {
                console.error('!records for id:', profileFromFacebook.id, '\nrecords:', records);
            } else if(records.length !== 1) {
                console.error('records.length !== 1 for id:', profileFromFacebook.id, '\nrecords:', records);
            } else {
                var profileFromSQL = JSON.parse(records[0].profile);
                var isDifferent = false;
                var keys = Object.keys(profileFromSQL);
                if(keys.length != Object.keys(profileFromFacebook).length) {
                    isDifferent = true;
                } else {
                    for(var key in profileFromFacebook) {
                        if(key === 'status') //don't check status   
                            continue;
                        if(key !== 'status' && profileFromFacebook[key] !== profileFromSQL[key]) {
                            isDifferent = true;
                            break;
                        }
                    }
                }
                if(isDifferent) {
                    // console.error('found updated profile, orig:', profileFromSQL, '\nnew:', profileFromFacebook);
                    dataStore.logUpdatePerson(profileFromFacebook);
                } else {
                    // console.error('no update, sql:', profileFromSQL.description, ', tw:', profileFromFacebook.description);
                }
            }
        })
    })
}

function addPeople(people, knownIDs) {
    for(var i in people) {
        var person = people[i];
        locker.event('contact/facebook', person);
        knownIDs[person.id_str] = 1;
        dataStore.addPerson(person);    
    }
}

function logRemoved(ids) {
    if(!ids)
        return;
    var knownIDs = allKnownIDs;
    ids.forEach(function(id) {
        dataStore.logRemovePerson(id);
        delete knownIDs[id];
    });
    fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
}

// Syncs the profile of the auth'd user
exports.syncProfile = function(callback) {
    getUserInfo(function(err, newUserInfo) {
        userInfo = newUserInfo;
        lfs.writeObjectToFile('userInfo.json', userInfo);
        callback(err, newUserInfo);
    });
}

// Gets the profile of the auth'd user
function getUserInfo(callback) {
    if(!getFacebookClient())
        return;
    getFacebookClient().apiCall('GET', '/me', {access_token:auth.token}, callback);
}

// Gets the list of IDs of friends of the auth'd user
function getIDs(screenName, callback) {
    getFacebookClient().apiCall('GET', '/me/friends', {access_token: auth.token}, function(err, result) {
        if(err) {
            console.error(err);
            return callback(err, result);
        } else {
            var dataLength = result.data.length;
            var ids = [];
            for (var i = 0; i < dataLeength; i++) {
                if (result.data[i].id) {
                    ids.push(result.data[i].id);
                }
            }
            callback(null, ids);
        }
    });
}


// Get extended profile info about the users in userIDs
function getUsersExtendedInfo(userIDs, callback) {
    _getUsersExtendedInfo(userIDs, [], callback);
}

function _getUsersExtendedInfo(userIDs, usersInfo, callback) {
    if(!usersInfo)
        usersInfo = [];
    var idString = "";
    for(var i = 0; i < 100 && userIDs.length > 0; i++) {
        idString += userIDs.pop();
        if(i < 99) {
            idString += ',';
        }
    }
    getFacebookClient().apiCall('GET', '?ids=' + idStr, {access_token: auth.token},
        function(error, result) {
            if(error) {
                sys.debug('error! ' + JSON.stringify(error));
                return;
            }
            addAll(usersInfo, result.reverse());
            if(userIDs.length > 0) 
                _getUsersExtendedInfo(userIDs, usersInfo, callback);
            else if(callback) {
                callback(usersInfo);
            }
        });
}

// Ensures that we are always working with the same, valid and auth'd facebook client object
function getFacebookClient() {
    if(!facebookClient && auth && auth.token) {
        facebookClient = require('facebook-js')();
    }
    return facebookClient;
}

/** 
 *  returns object with:
 *  remaining_hits (api call remaining),
 *  hourly_limit (total allowed per hour), 
 *  reset_time (time stamp), 
 *  reset_time_in_seconds (unix time in secs)
 */
exports.getRateLimitStatus = function(callback) {
    // TODO: AFAIK, no URL available to get rate limit status from Facebook.  Only throws "auth error" after 600 req. in 600 sec.
    /*
    request.get({uri:''}, function(err, resp, body) {
        var limits = JSON.parse(body);
        var remainingTime = limits.reset_time_in_seconds - (new Date().getTime() / 1000);
        if(limits.remaining_hits)
            limits.sec_between_calls = remainingTime / limits.remaining_hits;
        else
            limits.sec_between_calls = remainingTime / 1;
        callback(limits);
    });
    */
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