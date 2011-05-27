/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require('request'),
    fs = require("fs");
    sys = require('sys'),
    http = require("http"),
    url = require("url"),
    querystring = require("querystring");
    
var lmongoclient;

var lockerBase;
var localServiceId = undefined;
var baseServiceUrl = undefined;

exports.initClient = function(instanceInfo) {
    var meData = fs.readFileSync(instanceInfo.workingDirectory + "/me.json");
    var svcInfo = JSON.parse(meData);
    localServiceId = svcInfo.id;
    lockerBase = instanceInfo.lockerUrl;
    baseServiceUrl = lockerBase + "/core/" + localServiceId;
    if(instanceInfo.mongo) {
        lmongoclient = require(__dirname + '/lmongoclient')(instanceInfo.mongo.host, instanceInfo.mongo.port, 
                                                            localServiceId, instanceInfo.mongo.collections);
        exports.connectToMongo = lmongoclient.connect;
    }
}

exports.at = function(uri, delayInSec) {
    request.get({
        url:baseServiceUrl + '/at?' + querystring.stringify({
            cb:uri,
            at:((new Date().getTime() + (delayInSec * 1000))/1000)
            })
    });
}

exports.diary = function(message, level) {
    request.get({
        url:baseServiceUrl + '/diary?' + querystring.stringify({
            message:message,
            level:level
        })
    });
}

exports.map = function(callback) {
    request.get({url:lockerBase + "/map"}, function(error, res, body) {
        callback(body ? JSON.parse(body) : undefined);
    });
}

exports.providers = function(types, callback) {
    if (typeof(types) == "string") types = [types];
    request.get({url:lockerBase + "/providers?" + querystring.stringify({"types":types.join(",")})}, 
    function(error, res, body) {
        callback(body ? JSON.parse(body) : undefined);
    });
}

/**
 * Post an event
 * type - the MIME-style type of the object (e.g. photo/flickr, message/IMAP, or link/firefox)
 * obj - the object to make a JSON string of as the event body
 */
exports.event = function(type, obj) {
    request.post({
        url:baseServiceUrl + "/event",
        json:{"type":type,"obj":obj}
    });
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
}