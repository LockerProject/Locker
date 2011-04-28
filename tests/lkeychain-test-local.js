/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/*
* Tests the acutal implementation of the lservicemanager.  
* See locker-core-ap-test.js for a test of the REST API interface to it.
*/
var vows = require('vows');
var assert = require('assert');
var fs = require('fs');
var util = require('util');
var events = require('events');
var testUtils = require(__dirname + '/test-utils.js');
require.paths.push(__dirname + '/../Common/node');

var keychain = require('lkeychain');

var objectID, otherObjectID;

vows.describe('Keychain').addBatch({
    'can put an auth token on the keychain with a descriptor': function() {
        objectID = keychain.putAuthToken({'test':1}, 'myservicetype', {'username': 'Mr. Locker Test'});
    },
    'can put an auth token on the keychain without a descriptor': function() {
        otherObjectID = keychain.putAuthToken({'test2':2}, 'myservicetype');
    }
}).addBatch({
    'can get a list of objects descriptors by service type': function() {
        var descriptors = keychain.getTokenDescriptors('myservicetype');
        assert.isNotNull(descriptors);
        assert.equal(Object.keys(descriptors).length, 2);
        var oneNull = null, oneNotNull = null;
        for(var i in descriptors) {
            if(descriptors[i] == null)
                oneNull = i;
            else
                oneNotNull = i;
        }
        assert.equal(descriptors[oneNull], undefined); //meaning there is an ID, but not a descriptor
        assert.isNotNull(descriptors[oneNotNull]);
        assert.equal(oneNotNull, objectID); //meaning there is an ID and descriptor
        assert.equal(descriptors[oneNotNull].username, 'Mr. Locker Test');
    },
    'can permission a service ID to an object': function() {
        keychain.grantPermission(objectID, 'testid');
    }
}).addBatch({
    'can get an object with permissions': function() {
        var obj = keychain.getAuthToken(objectID, 'testid');
        assert.equal(obj.test, 1);
    },
    'can\'t get an object without permissions': function() {
        var error = null;
        try {
            keychain.getAuthToken(otherObjectID, 'testid');
        } catch(err) {
            error = err;
        }
        assert.isNotNull(error);
    }
/*}).addBatch({
    'permissions and data are persisted to disk':  {
        topic:function() {
            var promise = new(events.EventEmitter);
            setTimeout(function() {
                if(keychain.getAuthToken(otherObjectID, 'testid')['test2'] != 2) {
                    promise.emit("error", false);
                } else {
                    promise.emit('success', true)
                }
                
            }, 100);
            return promise;
        },
        'in a timely manner': function(err, stat) {
            assert.isNull(err);
            assert.isTrue(stat);
        }
    }*/
}).export(module);
