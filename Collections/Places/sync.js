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
var locker = require('locker.js');
var lutil = require('lutil');
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
};

function reset(flag, callback)
{
    if(flag) return callback();
    dataStore.clear(function(err) {
        request.get({uri:lconfig.lockerBase + '/Me/search/reindexForType?type=place'}, callback);
    });
}
exports.gatherPlaces = function(type, cb) {
    reset(type, function(){
        cb(); // synchro delete, async/background reindex
        var types = (type) ? [type] : ['checkin','tweets','location','photo/instagram'];
        locker.providers(types, function(err, services) {
            if (!services) return;
            async.forEachSeries(services, function(svc, callback) {
                if (svc.provider === 'twitter') {
                    async.forEachSeries(["timeline/twitter", "tweets/twitter"], function(type, cb2) { gatherFromUrl(svc.id, type, cb2); }, callback);
                } else if (svc.provider === 'foursquare') {
                    async.forEachSeries(["recents/foursquare", "checkin/foursquare"], function(type, cb2) { gatherFromUrl(svc.id, type, cb2); }, callback);
                } else if (svc.provider === 'glatitude') {
                    gatherFromUrl(svc.id, "location/glatitude", callback);
                } else if (svc.provider === 'instagram') {
                    async.forEachSeries(["feed/instagram", "photo/instagram"], function(type, cb2) { gatherFromUrl(svc.id, type, cb2); }, callback);
                } else {
                    callback();
                }
            }, function(){
                logger.info("DONE UPDATING PLACES");
            });
        });
    });
};

function gatherFromUrl(svcId, type, callback) {
    var url = path.join("Me", svcId, "getCurrent", type.split("/")[0]);
    url = lconfig.lockerBase + "/" + url + "?stream=true";
    logger.info("updating from "+url);
    var total = 0;
    lutil.streamFromUrl(url, function(js, cb){
        total++;
        dataIn.addData(svcId, type, js, cb);
    }, function(){
        logger.info("indexed "+total+" items from "+svcId);
        callback();
    });
}

// optionally geocode anything in this network
exports.geoCode = function(network, callback)
{
    var todo = [];
    dataStore.getNetwork(network, function(place){
        if(!place) return;
        if(!place.geo || !place.geo.address) todo.push(place);
    }, function(){
        async.forEachSeries(todo, function(place, cb){
            var url = "http://api.geonames.org/findNearestAddressJSON?username=singly&lat="+place.lat+"&lng="+place.lng;
            logger.verbose(url);
            request.get({uri:url, json:true}, function(err, res, js){
                if(err) logger.error(url+" "+err);
                if(res && res.statusCode != 200) logger.error(url+" code "+res.statusCode);
                if(!js) js = {};
                place.geo = js;
                dataStore.updatePlace(place, cb);
            });
        }, callback);
    });
}