/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    lfs = require('../../Common/node/lfs.js'),
    request = require('request'),
    dataStore = require('../../Common/node/connector/dataStore'),
    utils = require('../../Common/node/connector/utils'),
    app = require('../../Common/node/connector/api'),
    EventEmitter = require('events').EventEmitter;

    
var updateState, auth, allKnownIDs;

exports.eventEmitter = new EventEmitter();

exports.init = function(theauth, mongo) {
    auth = theauth;
    dataStore.init("id", mongo);
}

exports.syncItems = function(callback) {
    // here you would pull down all the items from the provider, after each item, you would:
    dataStore.addObject('items', item, function(err) {
        var eventObj = {source:'items', type:'new', status:item};
        exports.eventEmitter.emit('event/Type', eventObj);
    });
    callback(err, 3600, "Updated " + items.length + " items");    
}