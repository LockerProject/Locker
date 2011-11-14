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

exports.gatherPlaces = function(cb) {
    lconfig.load('../../Config/config.json');
    dataStore.clear(function(err) {
        request.get({uri:lconfig.lockerBase + '/Me/search/reindexForType?type=place'}, function() {
            cb(); // synchro delete, async/background reindex
            locker.providers(['place','checkin','tweets','location'], function(err, services) {
                if (!services) return;
                services.forEach(function(svc) {
                    if(svc.type === 'collection') return;
                    if (svc.provider === 'twitter') {
                        gatherFromUrl(svc.id, "/getCurrent/home_timeline", "timeline/twitter");
                        gatherFromUrl(svc.id, "/getCurrent/timeline", "timeline/twitter");
                        gatherFromUrl(svc.id, "/getCurrent/tweets", "tweets/twitter");
                    } else if (svc.provider === 'foursquare') {
                        gatherFromUrl(svc.id, "/getCurrent/places", "checkin/foursquare");
                        gatherFromUrl(svc.id, "/getCurrent/recent", "recents/foursquare");
                        gatherFromUrl(svc.id, "/getCurrent/recents", "recents/foursquare");
                        gatherFromUrl(svc.id, "/getCurrent/checkin", "checkin/foursquare");
                        gatherFromUrl(svc.id, "/getCurrent/checkins", "checkin/foursquare");
                    } else if (svc.provider === 'glatitude') {
                        gatherFromUrl(svc.id, "/getCurrent/location", "location/glatitude");
                    }
                });
            });
        });
    });
};

function gatherFromUrl(svcId, url, type) {
    console.log(lconfig.lockerBase + '/Me/' + svcId + url);
    request.get({uri:lconfig.lockerBase + '/Me/' + svcId + url}, function(err, resp, body) {
        if (err) {
            logger.debug("Error getting basic places from " + svcId);
            return;
        }
        try {
            var arr = JSON.parse(body);
            if (!arr) throw("No data");
            dataStore.addData(svcId, type, arr);
        } catch (E) {
            console.error("Error processing places from " + svcId + url + ": " + E);
        }
    });
}
