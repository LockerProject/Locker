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
var lconfig = require('../../Common/node/lconfig.js');
var dataStore = require('./dataStore');
var lockerUrl;
var EventEmitter = require('events').EventEmitter;
var logger = require("../../Common/node/logger.js").logger;

exports.init = function(theLockerUrl, mongoCollection, mongo, locker) {
    logger.debug("Photos sync init mongoCollection(" + mongoCollection + ")");
    lockerUrl = theLockerUrl;
    dataStore.init(mongoCollection, mongo, locker);
    exports.eventEmitter = new EventEmitter();
}

var photoGatherers = {
    "photo/twitpic":gatherTwitpic,
    "checkin/foursquare":gatherFoursquare
};

exports.gatherPhotos = function(cb) {
    lconfig.load('../../Config/config.json');
    dataStore.clear(function(err) {
        request.get({uri:lconfig.lockerBase + '/Me/search/reindexForType?type=photo/full'}, function() {
            cb(); // synchro delete, async/background reindex
            locker.providers(['photo','checkin','status'], function(err, services) {
                if (!services) return;
                services.forEach(function(svc) {
                    var gathered = false;
                    var lastType = "";
                    svc.provides.forEach(function(providedType) {
                        if (providedType !== 'photo' && (providedType.indexOf('photo') === 0 || providedType.indexOf('checkin/foursquare') === 0 || providedType.indexOf('status/twitter') === 0)) {
                            logger.debug(providedType);
                            lastType = providedType;
                            if (photoGatherers.hasOwnProperty(providedType)) {
                                gathered = true;
                                photoGatherers[providedType](svc.id);
                            }
                        }
                    });
                    // Try the basic type gatherer
                    if (!gathered) {
                        basicPhotoGatherer(svc.id, lastType);
                    }
                });
            });
            // also try twitter, fails out if none
            gatherFromUrl("twitter","/getCurrent/tweets","status/twitter");
        });
    });
}


function gatherTwitpic(svcId) {
    gatherFromUrl(svcId, "/allPhotos", "photo/twitpic");
}

function gatherFoursquare(svcId) {
    gatherFromUrl(svcId, "/getCurrent/checkin", 'checkin/foursquare');
}

function basicPhotoGatherer(svcId, type, provides) {
    gatherFromUrl(svcId, "/getCurrent/photo", type);
}

function gatherFromUrl(svcId, url, type) {
    request.get({uri:lconfig.lockerBase + '/Me/' + svcId + url}, function(err, resp, body) {
        if (err) {
            logger.debug("Error getting basic photos from " + svcId);
            return;
        }
        try {
            var arr = JSON.parse(body);
            if (!arr) throw("No data");
            dataStore.addData(svcId, type, arr);
        } catch (E) {
            console.error("Error processing photos from " + svcId + url + ": " + E);
            console.error('Got back: ' + body);
        }
    });
}
