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
        request.get({uri:lconfig.lockerBase + '/Me/search/reindexForType?type=place/full'}, function() {
            cb(); // synchro delete, async/background reindex
            locker.providers(['place','checkin','tweets'], function(err, services) {
                if (!services) return;
                services.forEach(function(svc) {
                    if(svc.handle === 'places') return;
                    if (svc.provider === 'twitter') {
                        gatherFromUrl(svc.id, false, "/getCurrent/home_timeline", "timeline/twitter");
                        gatherFromUrl(svc.id, false, "/getCurrent/timeline", "timeline/twitter");
                        gatherFromUrl(svc.id, true, "/getCurrent/tweets", "tweets/twitter");
                    } else if (svc.provider === 'foursquare') {
                        gatherFromUrl(svc.id, true, "/getCurrent/places", "checkin/foursquare");
                        gatherFromUrl(svc.id, false, "/getCurrent/recent", "recents/foursquare");
                        gatherFromUrl(svc.id, false, "/getCurrent/recents", "recents/foursquare");
                        gatherFromUrl(svc.id, true, "/getCurrent/checkin", "checkin/foursquare");
                        gatherFromUrl(svc.id, true, "/getCurrent/checkins", "checkin/foursquare");
                    } else if (svc.provider === 'glatitude') {
                        gatherFromUrl(svc.id, true, "/getCurrent/location", "location/glatitude");
                    }
                });
            });
        });
    });
};

function gatherFromUrl(svcId, isThisMe, url, type) {
    request.get({uri:lconfig.lockerBase + '/Me/' + svcId + url}, function(err, resp, body) {
        if (err) {
            logger.debug("Error getting basic places from " + svcId);
            return;
        }
        try {
            var arr = JSON.parse(body);
            if (!arr) throw("No data");
            
            async.forEach(arr, function(i, forEachCb) {
                i.me = isThisMe;
                forEachCb();
            },
            function(e) {
                dataStore.addData(svcId, type, arr);
            });        
        } catch (E) {
            console.error("Error processing places from " + svcId + url + ": " + E);
            console.error('Got back: ' + body);
        }
    });
}
