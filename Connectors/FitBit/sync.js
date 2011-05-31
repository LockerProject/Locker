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
    dataStore = require('../../Common/node/ldataStore');
    
var auth, userInfo, latests;
var client;
var allKnownIDs;
var requestCount = 0;

exports.eventEmitter = new EventEmitter();

// Initialize the state
exports.init = function(theAuth, mongoCollections) {
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
    dataStore.init('id_str', mongoCollections);
}

exports.updateCurrent = function(type, callback) {
    if(!getClient()) {
        callback('missing auth info :(');
        return;
    }
    if(type === '') {
        
    } else if(type === '') {
        
    } else {
        callback('invalid type');
    }
}

exports.syncNew = function(type, callback) {
    if(!getClient()) {
        callback('missing auth info :(');
        return;
    }
    if(type === '') {
        
    } else if(type === '') {
        
    } else {
        callback('invalid type');
    }
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