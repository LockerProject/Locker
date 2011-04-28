/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var vows = require("vows");
var assert = require("assert");
var events = require("events");
var keychainClient = require('../Common/node/keychain-client.js');
var lconfig = require('../Common/node/lconfig.js')

var serviceType = 'clientservicetype';
var serviceID = 'clientserviceID';

var authToken1 = {'test':1}, descriptor1 = null;
var authToken2 = {'test2':2}, descriptor2 = {'username': 'Mr. Locker Test'};

//CONFIGFIX
keychainClient.init(lconfig.lockerBase, serviceID);
var authTokenID1, authTokenID2;

vows.describe("Keychain Client API").addBatch({
    'Putting 2 authTokens on the keychain': {
        topic:function() {
            var promise = new(events.EventEmitter);
            keychainClient.putAuthToken(authToken2, serviceType, descriptor2, function(err, resp) {
                if(err) {
                    console.log(err);
                    promise.emit('error', false);
                } else {
                    authTokenID2 = resp.authTokenID;
                    keychainClient.putAuthToken(authToken1, serviceType, descriptor1, function(err, resp) {
                        if(err) {
                            console.log(err);
                            promise.emit('error', false);
                        } else {
                            authTokenID1 = resp.authTokenID;
                            promise.emit('success', true);
                        }
                    });
                }
            });
            return promise;
        },
        'returns 2 authTokenIDs': function(err, stat) {
            assert.isNotNull(authTokenID1);
            assert.isNotNull(authTokenID2);
            assert.isNull(err);
            assert.equal(stat, true);
        }
    }
}).addBatch({
    'Getting a list of auth token descriptors by service type': {
        topic:function() {
            var promise = new(events.EventEmitter);
            keychainClient.getTokenDescriptors(serviceType, function(err, descriptors) {
                if(Object.keys(descriptors).length != 2) {
                    promise.emit('error', false);
                } else if(!descriptors.hasOwnProperty(authTokenID1)) {
                    promise.emit('error', false);
                } else if(!descriptors.hasOwnProperty(authTokenID2)) {
                    promise.emit('error', false);
                } else if(descriptors[authTokenID1] != descriptor1) {
                    promise.emit('error', false);
                } else if(descriptors[authTokenID2].username != descriptor2.username) {
                    promise.emit('error', false);
                } else {
                    promise.emit('success', true);
                }
            });
            return promise;
        },
        'returns 2 valid objects': function(err, stat) {
            assert.isNull(err);
            assert.equal(stat, true);
        }
    },
    'Granting permission to a service ID for an object': {
        topic:function() {
            var promise = new(events.EventEmitter);
            keychainClient.grantPermission(authTokenID2, serviceID, function(err) {
                if(err) {
                    promise.emit('error', false);
                } else {
                    promise.emit('success', true);
                }
            });
            return promise;
        },
        'returns successfully': function(err, stat) {
            assert.isNull(err);
            assert.equal(stat, true);
        }
    }
}).addBatch({
    'Getting an auth token with proper permissions': {
        topic:function() {
            var promise = new(events.EventEmitter);
            keychainClient.getAuthToken(authTokenID2, function(err, authToken) {
                if(authToken.test2 != authToken2.test2) {
                    promise.emit('error', false);
                } else {
                    promise.emit('success', true);
                }
            });
            return promise;
        },
        'returns the object successfully': function(err, stat) {
            assert.isNull(err);
            assert.equal(stat, true);
        }   
    },
    'Getting an object without proper permissions': {
        topic:function() {
            var promise = new(events.EventEmitter);
            keychainClient.getAuthToken(authTokenID1, function(err, obj) {
                if(!err) {
                    promise.emit('error', false);
                } else {
                    promise.emit('success', true);
                }
            });
            return promise;
        },
        'returns an error': function(err, stat) {
            assert.isNull(err);
            assert.equal(stat, true);
        }
    }
}).export(module);