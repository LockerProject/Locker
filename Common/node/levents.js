/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var http = require("http");
var url = require("url");
require.paths.push(__dirname);

var locker = require("locker");
var serviceManager = require("lservicemanager");

var eventListeners = {};

exports.addListener = function(type, id, cb) {
    console.log("Adding a listener for " + id + cb + " to " + type);
    if (!eventListeners.hasOwnProperty(type)) eventListeners[type] = [];
    eventListeners[type].push({"id":id, "cb":cb});
}

exports.removeListener = function(type, id, cb) {
    console.log("Going to remove " + id + cb + " from " + type);
    if (!eventListeners.hasOwnProperty(type)) return;
    var pos = findListenerPosition(type, id, cb);
    if (pos >= 0) eventListeners[type].splice(pos, 1);
}

exports.fireEvent = function(type, id, obj) {
    if (!eventListeners.hasOwnProperty(type)) return;
    console.log("Firing " + eventListeners[type].length + " listeners for " + type + " from " + id);
    eventListeners[type].forEach(function(listener) {
        if (!serviceManager.isInstalled(listener.id)) return;
        function sendEvent() {
            var serviceInfo = serviceManager.metaInfo(listener.id);
            var cbUrl = url.parse(serviceInfo.uriLocal);
            var httpOpts = {
                host: cbUrl.hostname,
                port: cbUrl.port,
                path: listener.cb,
                method:"POST",
                headers: {
                    "Content-Type":"application/json"
                }
            };
            console.log("Firing event to " + listener.id + " to " + listener.cb);
            locker.makeRequest(httpOpts, JSON.stringify({obj:obj, _via:[id]}));
        }
        if (!serviceManager.isRunning(listener.id)) {
            serviceManager.spawn(listener.id, sendEvent);
        } else {
            sendEvent();
        }
    });
}

function findListenerPosition(type, id, cb) {
    for (var i = 0; i < eventListeners[type].length; ++i) {
        var listener = eventListeners[type][i];
        if (listener.id == id && listener.cb == cb) return i;
    }
    return -1;
}
