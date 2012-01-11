/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require('request');
var locker = require('../../Common/node/locker.js');
var lconfig;
var dataStore = require('./dataStore');
var async = require('async');
var lockerUrl;
var logger;
var EventEmitter = require('events').EventEmitter;

exports.init = function(theLockerUrl, mongoCollection, mongo, config) {
    lockerUrl = theLockerUrl;
    lconfig = config;
    logger = require(__dirname + "/../../Common/node/logger.js");
    dataStore.init(mongoCollection, mongo);
    exports.eventEmitter = new EventEmitter();
}

var acceptedServices = {
    'contact/facebook':1,
    'contact/twitter':1,
    'contact/flickr':1,
    'contact/gcontacts':1,
    'contact/foursquare':1,
    'contact/instagram':1,
    'connection/linkedin':1,
    'contact/github':'following'
}

exports.gatherContacts = function(cb) {
    lconfig.load('../../Config/config.json');
    dataStore.clear(function(err) {
        // now that we've deleted them, we need to tell search to whack ours too before we start
        request.get({uri:lconfig.lockerBase + '/Me/search/reindexForType?type=contact'}, function(){
            cb(); // synchro delete, async/background reindex
            // This should really be timered, triggered, something else
            locker.providers(['contact'], function(err, services) {
                locker.providers(['connection'], function(err, connectionServices) {
                    if (!(services || connectionServices)) return;
                    services = services || [];
                    for(var i in connectionServices) services.push(connectionServices[i]);
                    services.forEach(function(svc) {
                        for(var i in svc.provides) {
                            var provides = svc.provides[i];
                            if(acceptedServices[provides]) {
                                var endpoint = acceptedServices[provides];
                                if(endpoint === 1) endpoint = provides.substring(0, provides.indexOf('/'));
                                exports.getContacts(svc.provider, endpoint , svc.id, function() {
                                    logger.info(svc.provider + ' done!');
                                });
                                return;
                            }
                        }
                    });
                });
            });
        });
    });
}

exports.getContacts = function(type, endpoint, svcID, callback) {
    request.get({uri:lconfig.lockerBase + '/Me/' + svcID + '/getCurrent/' + endpoint, json:true}, function(err, resp, body) {
        if(err || !body || !Array.isArray(body)) return callback(err);
        async.forEachSeries(body, function(contact, cb){
            dataStore.addData(type, contact, cb);
        }, callback);
    });
}
