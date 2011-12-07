/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require("request");
var url = require("url");
require.paths.push(__dirname);
var lconfig = require("lconfig");
var serviceManager = require("lservicemanager");
var logger = require("./logger.js");
var syncManager = require('lsyncmanager');
var url = require('url');

var eventListeners = {};
var processingQueue = []; // queue of events being processed

exports.addListener = function(type, id, cb) {
    logger.info("Adding a listener for " + id + cb + " to " + type);
    if (!eventListeners.hasOwnProperty(type)) eventListeners[type] = [];
    // Remove the previous listener for the id
    eventListeners[type] = eventListeners[type].filter(function(entry) {
        if (entry["id"] == id) return false;
        return true;
    });
    eventListeners[type].push({"id":id, "cb":cb});
}

exports.removeListener = function(type, id, cb) {
    logger.info("Going to remove " + id + cb + " from " + type);
    if (!eventListeners.hasOwnProperty(type)) return;
    var pos = findListenerPosition(type, id, cb);
    if (pos >= 0) eventListeners[type].splice(pos, 1);
}

// get all possible listeners
function fetchListeners(idr)
{
    var r = url.parse(idr);
    var types = [];
    // we're back-porting to the type system for now too
    var oldType = r.protocol.substr(0,r.protocol.length-1);
    types.push(oldType);
    oldType += '/' + r.host;
    types.push(oldType);
    if(r.pathname && r.pathname.length > 1)
    {
        oldType = r.pathname.substr(1);
        types.push(oldType);
        oldType += '/' + r.host;
        types.push(oldType);
    }
    delete r.hash;
    delete r.search;
    types.push(url.format(r));
    delete r.pathname;
    types.push(url.format(r));
    var ret = [];
    types.forEach(function(type){
        if(!eventListeners.hasOwnProperty(type)) return;
        eventListeners[type].forEach(function(e){ret.push(e)});
    });
    return ret;
}

exports.fireEvent = function(idr, action, obj) {
    logger.verbose("Firing an event for " + idr + " action(" + action + ")");
    // Short circuit when no one is listening
    var listeners = fetchListeners(idr);
    if (listeners.length == 0) return;
    var newEventInfo = {
        idr:idr,
        action:action,
        data:obj,
        listeners:listeners
    };
    processingQueue.push(newEventInfo);
    // We bail out unless this is the first time into the queue
    if (processingQueue.length == 1)
        processEvents(processingQueue);
    else
        process.nextTick(function() { processEvents(processingQueue); });
}

exports.displayListeners = function(type) {
    return eventListeners[type];
}

function findListenerPosition(type, id, cb) {
    for (var i = 0; i < eventListeners[type].length; ++i) {
        var listener = eventListeners[type][i];
        if (listener.id == id && listener.cb == cb) return i;
    }
    return -1;
}

function processEvents(queue) {
    // Only the first one is started and it will continue until empty
    if (!queue || queue.length > 1) {
        //console.log("Bailing on the queue");
        //console.dir(queue);
        return;
    }

    //console.log("processing " + queue.length + " events for " + queue[0].via);
    // We loop over all the pending events to fire from the service
    do {
        var curEvent = queue.pop();
        //logger.log("Current event from " + curEvent.via + " " + curEvent.listeners.length + " listeners");
        curEvent.listeners.forEach(function(listener) {
            if (!serviceManager.isInstalled(listener.id)) return;
            //console.log("Send to " + listener.id);
            var serviceInfo = serviceManager.metaInfo(listener.id);
            //console.log("Sevice info " + serviceInfo.url);
            var cbUrl = url.parse(lconfig.lockerBase);
            var httpOpts = {
                url: "http://"+ cbUrl.hostname + ":" + cbUrl.port + "/Me/" + listener.id + listener.cb,
                method:"POST",
                headers: {
                    "Content-Type":"application/json",
                    "Connection":"keep-alive"
                },
                body: JSON.stringify({"idr":curEvent.idr, "action":curEvent.action, "data":curEvent.data})
            };
            logger.verbose("Firing event to " + listener.id + " to " + listener.cb);
            // I tried to do this with a replacer array at first, but it didn't take the entire obj, seemed to match on subkeys too
            request(httpOpts, function(err, response) {
                listener.response = response.statusCode;
                if (listener.response != 200) {
                    logger.error("There was an error sending an event to " + listener.id + " at " + listener.cb + " got " + listener.response + " " + response.body);
                    // TODO: Need to evaluate the logic here, to see if we should retry or other options.
                }
            });
        });
    } while (queue.length > 0)

}
