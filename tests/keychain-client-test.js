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

var srvType = 'clientservicetype';

vows.describe("Keychain Client API").addBatch({
    'Putting an object on the keychain': {
        topic:function() {
            var promise = new(events.EventEmitter);
            keychainClient.putObject(srvType, {'test2':2}, null, function(err, resp) {
                if(err) {
                    promise.emit('error', false);
                } else {
                    keychainClient.putObject(srvType, {'test':1}, {'username': 'Mr. Locker Test'}, function(err, resp) {
                        if(err) {
                            promise.emit('error', false);
                        } else {
                            promise.emit('success', true);
                        }
                    });
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
    'Getting a list of objects\' metadata by service type': {
        topic:function() {
            var promise = new(events.EventEmitter);
            keychainClient.getMetaForServiceType(srvType, function(err, objects) {
                if(objects.length != 2) {
                    promise.emit('error', false);
                } else if(objects[0] != null) {
                    promise.emit('error', false);
                } else if(objects[1].username != 'Mr. Locker Test') {
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
            keychainClient.grantPermission('testid', srvType, 0, function(err) {
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
    'Getting an object with proper permissions': {
        topic:function() {
            var promise = new(events.EventEmitter);
            keychainClient.getObject('testid', srvType, 0, function(err, obj) {
                if(obj['test2'] != 2) {
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
            keychainClient.getObject('testid2', srvType, 0, function(err, obj) {
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