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
var logger;
var EventEmitter = require('events').EventEmitter;

exports.init = function(theLockerUrl, mongoCollection, mongo, config) {
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
    clearAll(function() {
        getServices(function(services) {
            // do them in series so as not to pin the box
            async.forEachSeries(services, processService, function() {
                cb(); // synchro delete, async/background reindex
                logger.info('finished processing data from all services');
            });
        });
    });
}

function clearAll(callback) {
    dataStore.clear(function(err) {
        // now that we've deleted them, we need to tell search to whack ours too before we start
        request.get({uri:lconfig.lockerBase + '/Me/search/reindexForType?type=contact'}, callback);
    });
}

function getServices(callback) {
    locker.providers(['contact'], function(err, services) {
        locker.providers(['connection'], function(err, connectionServices) {
            if (!(services || connectionServices)) return;
            services = services || [];
            for(var i in connectionServices) services.push(connectionServices[i]);
            callback(services);
        });
    });
}

function processService(svc, callback) {
    for(var i in svc.provides) {
        var provides = svc.provides[i];
        if(acceptedServices[provides]) {
            var endpoint = acceptedServices[provides];
            if(endpoint === 1) endpoint = provides.substring(0, provides.indexOf('/'));
            logger.info('processing data from ' + svc.provider);
            getContacts(svc.provider, endpoint , svc.id, function() {
                logger.info('finished processing data from ' + svc.provider);
                callback();
            });
            return;
        }
    }
    callback();
}

function getContacts(type, endpoint, svcID, callback) {
    request.get({uri:lconfig.lockerBase + '/Me/' + svcID + '/getCurrent/' + endpoint, json:true}, function(err, resp, body) {
        if(err || !body || !Array.isArray(body)) return callback(err);
        async.forEachSeries(body, function(contact, cb) {
            dataStore.addData(type, contact, cb);
        }, callback);
    });
}
