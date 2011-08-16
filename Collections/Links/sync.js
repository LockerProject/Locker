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

exports.init = function(theLockerUrl, mongoCollection) {
    lockerUrl = theLockerUrl;
    dataStore.init(mongoCollection);
    exports.eventEmitter = new EventEmitter();
}

exports.gatherLinks = function() {
    lconfig.load('../../Config/config.json');
    dataStore.clear(function(err) {
        // This should really be timered, triggered, something else
        locker.providers(['link/facebook', 'status/twitter'], function(err, services) {
            if (!services) return;
            services.forEach(function(svc) {
                if(svc.provides.indexOf('link/facebook') >= 0) {
                    exports.getLinks("facebook", "newsfeed", svc.id, function() {
                        exports.getLinks("facebook", "wall", svc.id, function() {
                            console.error('facebook done!');
                        });
                    });
                } else if(svc.provides.indexOf('status/twitter') >= 0) {
                    exports.getLinks("twitter", "home_timeline", svc.id, function() {
                        console.error('twitter done!');
                    });
                }
            });
        });
    });
}


exports.getLinks = function(type, endpoint, svcID, callback) {
    request.get({uri:lconfig.lockerBase + '/Me/' + svcID + '/getCurrent/' + endpoint}, function(err, resp, body) {
        var arr = JSON.parse(body);
        processData(svcID, type, endpoint, arr, callback)
    });
}

function processData(svcID, type, endpoint, data, callback) {
    if (!(data && data.length)) {
        callback();
    } else if(type === 'facebook'){
        var obj = data.shift();
        if(obj.type === 'link') {
            dataStore.addData(svcID, type, {data:obj}, function(err, doc) {
                if (doc._id) {
                    var eventObj = {source: "links", type:endpoint, data:doc};
                    exports.eventEmitter.emit('link/full', eventObj);
                }
                processData(svcID, type, endpoint, data, callback);
                // console.log('got link from fb', obj);
            });
        } else {
            processData(svcID, type, endpoint, data, callback);
        }
    } else if(type === 'twitter') {
        var obj = data.shift();
        if(obj.entities && obj.entities.urls && obj.entities.urls.length) {
            dataStore.addData(svcID, type, {data:obj}, function(err, doc) {
                if (doc._id) {
                    var eventObj = {source: "links", type:endpoint, data:doc};
                    exports.eventEmitter.emit('link/full', eventObj);
                }
                processData(svcID, type, endpoint, data, callback);
                // console.log('got link from tw', obj.entities.urls);
            });
        } else {
            processData(svcID, type, endpoint, data, callback);
        }
    }
}