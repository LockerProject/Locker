/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require('request');
var async = require('async');
var path = require('path');
var locker = require('../../Common/node/locker.js');
var lconfig = require('../../Common/node/lconfig.js');
var dataStore = require('./dataStore');
var lockerUrl;
var EventEmitter = require('events').EventEmitter;
var logger = require("../../Common/node/logger.js").logger;

exports.init = function(theLockerUrl, mongoCollection, mongo, locker) {
    logger.debug("Places sync init mongoCollection(" + mongoCollection + ")");
    lockerUrl = theLockerUrl;
    dataStore.init(mongoCollection, mongo, locker);
    exports.eventEmitter = new EventEmitter();
};

function reset(flag, callback)
{
    if(flag) return callback();
    dataStore.clear(function(err) {
        request.get({uri:lconfig.lockerBase + '/Me/search/reindexForType?type=place'}, callback);
    });
}
exports.gatherPlaces = function(type, cb) {
    lconfig.load('../../Config/config.json');
    reset(type, function(){
        cb(); // synchro delete, async/background reindex
        var types = (type) ? [type] : ['checkin','tweets','location'];
        locker.providers(types, function(err, services) {
            if (!services) return;
            async.forEachSeries(services, function(svc, callback) {
                if (svc.provider === 'twitter') {
                    async.forEachSeries(["timeline/twitter", "tweets/twitter"], function(type, cb2) { gatherFromUrl(svc.id, type, cb2); }, callback);
                } else if (svc.provider === 'foursquare') {
                    async.forEachSeries(["recents/foursquare", "checkin/foursquare"], function(type, cb2) { gatherFromUrl(svc.id, type, cb2); }, callback);
                } else if (svc.provider === 'glatitude') {
                    gatherFromUrl(svc.id, "location/glatitude", callback);
                } else {
                    callback();
                }
            }, function(){
                console.log("DONE UPDATING PLACES");
            });
        });
    });
};

function gatherFromUrl(svcId, type, callback) {
    var url = path.join("Me", svcId, "getCurrent", type.split("/")[0]);
    url = lconfig.lockerBase + "/" + url;
    console.log("updating from "+url);
    request.get({uri:url, json:true}, function(err, resp, body) {
        if (err || !body) {
            logger.debug("Error getting basic places from " + svcId + " " + err);
            return callback(); // swallow errors here
        }
        if(!body.length || body.length == 0) return callback();
        // take a deep breath first
        setTimeout(function(){
            dataStore.addData(svcId, type, body, callback);
        }, 10000);
    });
}
