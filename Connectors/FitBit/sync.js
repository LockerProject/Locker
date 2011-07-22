/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js'),
    EventEmitter = require('events').EventEmitter,
    dataStore = require('../../Common/node/connector/dataStore');
    
var auth, userInfo, latests;
var client;
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
        userInfo = JSON.parse(fs.readFileSync('userInfo.json'));
    } catch (err) { userInfo = {}; }
    try {
        allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
    } catch (err) { allKnownIDs = {friends:{}, followers:{}}; }
    dataStore.init('id', mongo);
}
// 
// exports.updateCurrent = function(type, callback) {
//     if(!getClient()) {
//         callback('missing auth info :(');
//         return;
//     }
//     if(type === 'profile') {
//         updateProfile(callback);
//     } else if(type === 'sleepMinutesAsleep') {
//         updateTimeSeries('sleep/minutesAsleep', callback);
//     } else {
//         callback('invalid type');
//     }
// }

exports.update = function(type, callback) {
    if(!getClient()) {
        callback('missing auth info :(');
        return;
    }
    if(type === 'profile') {
        updateProfile(callback);
    } else if(type === 'devices') {
        updateDevices(callback);
    } else if(type === 'sleepMinutesAsleep') {
        updateTimeSeries('sleep/minutesAsleep', callback);
    } else {
        callback('invalid type');
    }
}

function updateProfile(callback) {
    makeApiCall('/user/-/profile.json',  {}, function(err, resp) {
        if(err) {
            console.error(err);
            callback(err, resp);
        } else {
            lfs.writeObjectToFile('profile.json',resp);
            callback(null, resp);
        }
    });
}

function updateDevices(callback) {
    makeApiCall('/user/-/devices.json', {}, function(err, resp) {
        if(err) {
            console.error(err);
            callback(err, 3600, resp);
        } else {
            for(var i in resp) {
                var device = resp[i];
                dataStore.getCurrent("devices", device.id, function(err, currentDevice) {
                    if(err || !currentDevice || device.battery != currentDevice.battery) {
                        dataStore.addObject("devices", device, function(err) {
                            if(err) {
                                console.error('DEBUG: updateDevices, err', err);
                            }
                        });
                    }
                });
            }
            callback(null, 3600, resp);
        }
    });
}

function updateTimeSeries(endpoint, callback) {
    makeApiCall('/user/-/' + endpoint + '/date/today/7d.json', {}, function(err, resp) {
        if(err) {
            console.error('err:', err, 'resp:', resp);
            callback(err, resp);
        } else {
            console.error('got', resp);
            // lfs.writeObjectToFile(endpoint + '.json',resp);
            callback(null, resp);
        }
        
    })
}

function makeApiCall(endpoint, params, callback) {
    params.token = auth.token;
    requestCount++;
    getClient().apiCall('GET', endpoint, params, callback);
}


// Ensures that we are always working with the same, valid and auth'd client
function getClient() {
    if(!client && auth && auth.consumerKey && auth.consumerSecret)
        client = require('fitbit-js')(auth.consumerKey, auth.consumerSecret);
    return client;
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