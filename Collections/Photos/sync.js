/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require('request');
var locker = require('locker.js');
var lconfig;
var dataStore = require('./dataStore');
var dataIn = require('./dataIn');
var lockerUrl;
var EventEmitter = require('events').EventEmitter;
var logger;

exports.init = function(theLockerUrl, mongo, locker, config) {
    lockerUrl = theLockerUrl;
    lconfig = config;
    logger = require("logger.js");
    dataStore.init(mongo, locker);
    exports.eventEmitter = new EventEmitter();
    dataIn.init();
}

var photoGatherers = {
    "photo/twitpic":gatherTwitpic,
    "checkin/foursquare":gatherFoursquare
};

exports.gatherPhotos = function(cb) {
    dataStore.clear(function(err) {
        request.get({uri:lconfig.lockerBase + '/Me/search/reindexForType?type=photo'}, function() {
            cb(); // synchro delete, async/background reindex
            locker.providers(['photo','checkin','tweets','post'], function(err, services) {
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

function gatherTumblr(svcId) {
    gatherFromUrl(svcId, "/getCurrent/post", 'post/tumblr');
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
            dataIn.addData(svcId, type, arr);
        } catch (E) {
            logger.error("Error processing photos from " + svcId + url + ": " + E);
        }
    });
}
