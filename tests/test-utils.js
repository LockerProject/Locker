/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var vows = require("vows");
var assert = require("assert");
var events = require("events");
var fs = require('fs');
var request = require('request');


exports.timeoutAsyncCallback = function(timeout, startCallback, runCallback) {
    var context = {
        topic: function (topic) {
            var emitter = new events.EventEmitter();
            var fired = false;
            startCallback(topic, timeout, function() {
                if (runCallback) {
                    fired = runCallback();
                } else {
                    fired = true;
                }
            });
            setTimeout(function() {
                if (fired) {
                    emitter.emit("success", true);
                } else {
                    emitter.emit("error", new Error("timeout"));
                }
            }, timeout*2);
            return emitter;
        }
    }
    context["and fires the callback in a timely fashion"] = function(err, fired) {
        assert.isNull(err);
        assert.isTrue(fired);
    }
    return context;
}


//checks to ensure a list of paths all exist
exports.checkFiles = function(paths, callback) {
    if(!paths || paths.length === 0) {
        callback();
        return;
    } else {
        var path = paths.pop();
        fs.stat(path, function(err, stat) {
            if(err) {
                callback(err);
                return;
            } else {
                exports.checkFiles(paths, callback);
            }
        });
    }
}

//retries, waiting for paths to exist
exports.waitForPathsToExist = function(paths, retries, timeout,  callback) {
    if(retries < 0) {
        callback(false);
        return;
    }
    setTimeout(function() {
        var files = [];
        for(var i in paths)
            files.push(paths[i]);
        
        exports.checkFiles(files, function(err) {
            if(err) {
                exports.waitForPathsToExist(paths, retries - 1, timeout,  callback);
                return;
            } else {
                callback(true);
                return;
            }
        })
    }, timeout);
}

//waits for a file to reach at least the expected size (in bytes), or returns false
exports.waitForFileToComplete = function(path, expectedSize, retries, timeout,  callback) {
    if(retries < 0) {
        callback(false);
        return;
    }
    setTimeout(function() {
        fs.stat(path, function(err, stat) {
            if(err || !stat || stat.size < expectedSize) {
                exports.waitForFileToComplete(path, expectedSize, retries - 1, timeout, callback);
                return;
            } else {
                callback(true);
                return;
            }
        });
    }, timeout);
}

//wait for event response, count the number of responses
exports.waitForEvents = function (url, retries, timeout, expectedResponses, value, callback) {
    if (retries === 0) {
        return callback(null, value);
    }
    if (expectedResponses === value.length) {
        return callback(null, value);
    }
    setTimeout(function() {
        request.get({uri: url}, function(err, resp, data) {
            retries--;
            exports.waitForEvents(url, retries, timeout, expectedResponses, JSON.parse(data), callback); 
        });
    }, timeout);
}

require.paths.push(__dirname + "/../Common/node");
var EventEmitter = require('events').EventEmitter;
exports.eventEmitter = new EventEmitter();

var lservicemanager = require('lservicemanager');
var locker = require('locker');
var levents = require('levents');
var oldFuncs = {};

// types is an array of the event types to listen for
exports.hijackEvents = function (types, svcId) {
    
    lservicemanager.isRunning = function() { return true; };
    lservicemanager.isInstalled = function() { return true; };
    lservicemanager.metaInfo = function() { return { uriLocal: 'http://testing:80/' }; };
    levents.makeRequest = function(httpOpts, body, callback) {
        //console.log("Emitting fake event for ");
        //console.dir(httpOpts);
        exports.eventEmitter.emit('event', body, callback);
    }
    
    for (var i = 0; i < types.length; i++) {
        levents.addListener(types[i], svcId, 'https://testing:80/');
    }
}

exports.tearDown = function() {
    lservicemanager.isRunning = oldFuncs.isRunning;
    lservicemanager.isInstalled = oldFuncs.isInstalled;
    lservicemanager.metaInfo = oldFuncs.metaInfo;
    locker.makeRequest = oldFuncs.makeRequest;
}
