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
    http = require("http"),
    url = require("url"),
    lstate = require("lstate"),
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
    if(stateField) lstate.next(stateField,(new Date().getTime() + (delayInSec * 1000)));
    request.get({
        url:baseServiceUrl + '/at?' + querystring.stringify({
            cb:uri,
            at:((new Date().getTime() + (delayInSec * 1000))/1000)
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

exports.makeRequest = function(httpOpts, body, callback) {
    var req = http.request(httpOpts, callback);
    req.write(body);
    req.end();
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
    if (action === undefined) action = "new";
    request.post({
        headers:{'Connection':'keep-alive'},
        url:baseServiceUrl + "/event",
        json:{"type":type,"obj":obj},
        action:action
    });
};

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
