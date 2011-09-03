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

exports.init = function(theLockerUrl, mongoCollection, mongo) {
    logger.debug("Photos sync init mongoCollection(" + mongoCollection + ")");
    lockerUrl = theLockerUrl;
    dataStore.init(mongoCollection, mongo);
    exports.eventEmitter = new EventEmitter();
}

var photoGatherers = {
    "photo/twitpic":gatherTwitpic,
    "photo/flickr":gatherFlickr
};

exports.gatherPhotos = function(cb) {
    lconfig.load('../../Config/config.json');
    dataStore.clear(function(err) {
        cb(); // synchro delete, async/background reindex
        locker.providers('photo', function(err, services) {
            if (!services) return;
            services.forEach(function(svc) {
                var gathered = false;
                var lastType = "";
                svc.provides.forEach(function(providedType) {
                    if (providedType == "photo" || providedType.indexOf("photo") < 0) return;
                    logger.debug(providedType);
                    lastType = providedType;
                    if (photoGatherers.hasOwnProperty(providedType)) {
                        gathered = true;
                        photoGatherers[providedType](svc.id);
                    }
                });
                // Try the basic type gatherer
                if (!gathered && svc.is == "connector") {
                    basicPhotoGatherer(svc.id, lastType);
                }
            });
        });
        // also try twitter, fails out if none
        gatherFromUrl("twitter","/getCurrent/tweets","status/twitter");
    });
}


function gatherTwitpic(svcId) {
    gatherFromUrl(svcId, "/allPhotos", "photo/twitpic");
}

function gatherFlickr(svcId) {
    gatherFromUrl(svcId, "/allPhotos", "photo/flickr");
}

function basicPhotoGatherer(svcId, type, provides) {
    gatherFromUrl(svcId, "/getCurrent/photos", type);
}

function gatherFromUrl(svcId, url, type) {
    request.get({uri:lconfig.lockerBase + '/Me/' + svcId + url}, function(err, resp, body) {
        if (err) {
            console.debug("Error getting basic photos from " + svcId);
            return;
        }
        try {
            var arr = JSON.parse(body);
            if (!arr) throw("No data");
            dataStore.addData(svcId, type, arr);
        } catch (E) {
            console.error("Error processing photos from " + svcId + ": " + E);
        }
    });
}
