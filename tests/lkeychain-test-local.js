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
var lconfig = require('lconfig');

vows.describe('Keychain').addBatch({
    'can put an object on the keychain': function() {
        keychain.putObject('myservicetype', {'test2':2});
        keychain.putObject('myservicetype', {'test':1}, {'username': 'Mr. Locker Test'});
    }
}).addBatch({
    'can get a list of objects\' metadata by service type': function() {
        var objects = keychain.getMetaForServiceType('myservicetype');
        assert.equal(objects.length, 2);
        assert.equal(objects[0], null);
        assert.equal(objects[1].username, 'Mr. Locker Test');
    },
    'can permission a service ID to an object': function() {
        keychain.grantPermission('testid', 'myservicetype', 0);
    }
}).addBatch({
    'can get an object with permissions': function() {
        var obj = keychain.getObject('testid', 'myservicetype', 0);
        assert.equal(obj['test2'], 2);
    },
    'can\'t get an object without permissions': function() {
        var error = null;
        try {
            keychain.getObject('testid2', 'myservicetype', 0);
        } catch(err) {
            error = err;
        }
        assert.isNotNull(error);
    }
}).addBatch({
    'permissions and data are persisted to disk':  {
        topic:function() {
            var promise = new(events.EventEmitter);
            setTimeout(function() {
                if(require('lkeychain').getObject('testid', 'myservicetype', 0)['test2'] != 2) {
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
    }
}).export(module);
