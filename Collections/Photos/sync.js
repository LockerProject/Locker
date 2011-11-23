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
        request.get({uri:lconfig.lockerBase + '/Me/search/reindexForType?type=photo'}, function() {
            cb(); // synchro delete, async/background reindex
            locker.providers(['photo','checkin','tweets'], function(err, services) {
                if (!services) return;
                services.forEach(function(svc) {
                    if(svc.handle === 'photos') return;
                    var gathered = false;
                    var lastType = "";

                    // If twitter, go off book and hit tweets
                    if(svc.provider === 'twitter')
                        gatherFromUrl(svc.id,"/getCurrent/tweets","tweets/twitter");
                    svc.provides.forEach(function(providedType) {
                        if (providedType !== 'photo' && (providedType.indexOf('photo') === 0
                         || providedType.indexOf('checkin/foursquare') === 0
                         || providedType.indexOf('tweets/twitter') === 0)) {
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
            logger.error("Error getting basic photos from " + svcId);
            return;
        }
        try {
            var arr = JSON.parse(body);
            if (!arr) throw("No data");
            dataStore.addData(svcId, type, arr);
        } catch (E) {
            logger.error("Error processing photos from " + svcId + url + ": " + E);
        }
    });
}
