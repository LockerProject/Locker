/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require('request');
var locker;
var lconfig;
var dataStore = require('./dataStore');
var async = require('async');
var logger;

exports.init = function(theLockerUrl, mongo, _locker, config) {
    lconfig = config;
    locker = _locker;
    logger = require('logger.js');
    dataStore.init(mongo, locker);
}

// TODO: this can be cleaned up further, the information is mostly captured in dataMap
// should only need to specify that contact/github is only pulled from following
var acceptedServices = {
    'contact/facebook':1,
    'contact/twitter':1,
    'contact/flickr':1,
    'contact/gcontacts':1,
    'contact/foursquare':1,
    'contact/instagram':1,
    'contact/tumblr':1,
    'connection/linkedin':1,
    'contact/github':'following'
}

exports.gatherContacts = function(callback) {
    clearAll(function(err) { // synchro delete, async/background reindex
        if(err) return callback(err);
        locker.providers(['contact','connection'], function(err, services) {
            if(err) return callback(err);
            // do them in series so as not to pin the box
            async.forEachSeries(services, processService, function(err) {
                callback(err);
                if(err) logger.error('error processing data from all services' + JSON.stringify(err));
                else logger.info('finished processing data from all services');
            });
        });
    });
}

function clearAll(callback) {
    dataStore.clear(function(err) {
        if(err && err.message !== 'ns not found') return callback(err);
        // now that we've deleted them, we need to tell search to whack ours too before we start
        request.get({uri:lconfig.lockerBase + '/Me/search/reindexForType?type=contact'}, callback);
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

function getContacts(type, endpoint, svcID, callback, offset) {
    if(!offset) offset = 0;
    request.get({uri:lconfig.lockerBase + '/Me/' + svcID + '/getCurrent/' + endpoint + '?limit=500&offset=' + offset, json:true}, function(err, resp, body) {
        if(err || !body || !Array.isArray(body)) return callback(err);
        if(body.length == 0) return callback();
        async.forEachSeries(body, function(contact, cb) {
            dataStore.addData(type, contact, cb);
        }, function(err) {
            if(err) return callback(err);
            getContacts(type, endpoint, svcID, callback, offset+500);
        });
    });
}

exports.getContacts = getContacts;
