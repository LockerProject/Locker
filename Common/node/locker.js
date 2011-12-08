/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require('request'),
    fs = require("fs"),
    sys = require('sys'),
    url = require("url"),
    lstate = require("lstate"),
    lutil = require("lutil"),
    querystring = require("querystring");

var lockerBase;
var localServiceId;
var baseServiceUrl;

exports.lockerBase = lockerBase;

exports.initClient = function(instanceInfo) {
    var meData = fs.readFileSync(instanceInfo.workingDirectory + "/me.json");
    var svcInfo = JSON.parse(meData);
    localServiceId = svcInfo.id;
    exports.lockerBase = instanceInfo.lockerUrl;
    baseServiceUrl = exports.lockerBase + "/core/" + localServiceId;
    if(instanceInfo.mongo) {
        exports.lmongoclient = require(__dirname + '/lmongoclient')(instanceInfo.mongo.host, instanceInfo.mongo.port,
                                                            localServiceId, instanceInfo.mongo.collections);
        exports.connectToMongo = exports.lmongoclient.connect;
    }
};

exports.at = function(uri, delayInSec, stateField) {
    if(stateField) lstate.next(stateField,(Date.now() + (delayInSec * 1000)));
    request.get({
        url:baseServiceUrl + '/at?' + querystring.stringify({
            cb:uri,
            at:((Date.now() + (delayInSec * 1000))/1000)
            })
    });
};

exports.diary = function(message, level) {
    request.get({
        url:baseServiceUrl + '/diary?' + querystring.stringify({
            message:message,
            level:level
        })
    });
};

exports.map = function(callback) {
    request.get({url:exports.lockerBase + "/map"}, function(error, res, body) {
        callback(error, body ? JSON.parse(body) : undefined);
    });
};

exports.synclets = function(callback) {
    request.get({url:exports.lockerBase + "/synclets"}, function(error, res, body) {
        callback(error, body ? JSON.parse(body) : undefined);
    });
};

exports.providers = function(types, callback) {
    if (typeof(types) == "string") types = [types];
    request.get({url:exports.lockerBase + "/providers?" + querystring.stringify({"types":types.join(",")})},
    function(error, res, body) {
        callback(error, body ? JSON.parse(body) : undefined);
    });
};

/**
 * Post an event
 * type - the MIME-style type of the object (e.g. photo/flickr, message/IMAP, or link/firefox)
 * obj - the object to make a JSON string of as the event body
 * action - the action, defaults to new
 */
exports.event = function(type, obj, action) {
    console.error("EVENT() DEPRECIATED, use ievent please");
};

/**
 * Post an event
 * idr - from .idr()
 * data - the object to make a JSON string of as the event body
 * action - the action, defaults to new
 */
exports.ievent = function(idr, data, action) {
    if(!idr || !data) return console.error("invalid input to ievent");
    if (action === undefined) action = "new";
    request.post({
        headers:{'Connection':'keep-alive'},
        url:baseServiceUrl + "/event",
        json:{"idr":idr,"data":data, action:action}
    });
};

// creates a locally scoped idr
exports.idrLocal = function(idr)
{
    var r = url.parse(idr);
    r.query = {id: localServiceId}; // best proxy of account id right now
    return url.format(r);
}

/**
 * Sign up to be notified of events
 * type - the MIME-style type of the object (e.g. photo/flickr, message/IMAP, or link/firefox)
 * callback - the URL path at the listener to callback to
 *
 * for example, if our id is "foo" and we want to get a ping at "/photoListener"
 * for photos from a flickr connector with id "bar", our call would look like this:
 *
 * listen("photo/flickr", "/photoListener");
 */
exports.listen = function(type, callbackEndpoint, callbackFunction) {
    request.get({url:baseServiceUrl + '/listen?' + querystring.stringify({'type':type, 'cb':callbackEndpoint})},
    function(error, response, body) {
        if(error) sys.debug(error);
        if(callbackFunction) callbackFunction(error);
    });
};

exports.deafen = function(type, callbackEndpoint, callbackFunction) {
    request.get({url:baseServiceUrl + '/deafen?' + querystring.stringify({'type':type, 'cb':callbackEndpoint})},
    function(error, response, body) {
        if(error) sys.debug(error);
        if(callbackFunction) callbackFunction(error);
    });
};
