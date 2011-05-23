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
var fs = require("fs");
var locker = require("../Common/node/locker.js");
var lconfig = require("../Common/node/lconfig.js");
var testUtils = require('./test-utils');

lconfig.load("config.json");

vows.describe("Locker Client API").addBatch({
    "Initialization" : {
        "sets the base service URL" : function() {
            var baseURL = lconfig.lockerBase;
            locker.initClient({workingDirectory:"Me/testURLCallback", lockerUrl:"test"});
//            assert.equal(lconfig.lockerBase, "test");
            locker.initClient({workingDirectory:"Me/testURLCallback", lockerUrl:baseURL});
        }
    }
}).addBatch({
    "Public APIs" : {
        "map" : {
            topic: function() {
                var promise = new events.EventEmitter;
                locker.map(function(svcMap) {
                    if (!svcMap) promise.emit("error", svcMap);
                    else promise.emit("success", svcMap);
                });
                return promise;
            },
            "can retrieve the service map" : function (err, data) {
                assert.isNull(err);
                assert.include(data, "installed");
                assert.include(data, "available");
            }
        },
        "providers" : {
            topic: function() {
                var promise = new events.EventEmitter;
                locker.providers("testtype/testproviders", function(providers) {
                    if (providers.length != 1) promise.emit("error", providers);
                    else if (providers[0].title != "Test /providers") promise.emit("error", providers);
                    else promise.emit("success", providers);
                });
                return promise;
            },
            "getting providers of type testtype/testproviders returns 1 valid service" : function (err, data) {
                assert.isNull(err);
                assert.include(data[0], "title");
                assert.include(data[0], "provides");
                assert.include(data[0], "srcdir");
                assert.include(data[0], "is");
                assert.include(data[0], "id");
            },
            topic: function() {
                var promise = new events.EventEmitter;
                locker.providers("badtype/badsvc", function(providers) {
                    if (providers.length != 0) promise.emit("error", providers);
                    else promise.emit("success", providers);
                });
                return promise;
            },
            "getting providers of type badtype/badsvc return an empty array" : function (err, data) {
                assert.isNull(err);
            },
            topic: function() {
                var promise = new events.EventEmitter;
                locker.providers("testtype/testproviders,testtype/anotherprovider", function(providers) {
                    if (providers.length != 2) promise.emit("error", providers);
                    else if (providers[0].title != "Test /providers") promise.emit("error", providers);
                    else if (providers[1].title != "Test /providers 2") promise.emit("error", providers);
                    else promise.emit("success", providers);
                });
                return promise;
            },
            "getting providers of types testtype/testproviders,testtype/anotherprovider returns an array of 2 valid providers" : function (err, data) {
                assert.isNull(err);
                for(var i in data) {
                    assert.include(data[i], "title");
                    assert.include(data[i], "provides");
                    assert.include(data[i], "srcdir");
                    assert.include(data[i], "is");
                    assert.include(data[i], "id");
                }
            },
            topic: function() {
                var promise = new events.EventEmitter;
                locker.providers("testtype", function(providers) {
                    if (providers.length != 2) promise.emit("error", providers);
                    else if (providers[0].title != "Test /providers") promise.emit("error", providers);
                    else if (providers[1].title != "Test /providers 2") promise.emit("error", providers);
                    else promise.emit("success", providers);
                });
                return promise;
            },
            "getting providers of types testtype returns an array of 2 valid providers" : function (err, data) {
                assert.isNull(err);
                for(var i in data) {
                    assert.include(data[i], "title");
                    assert.include(data[i], "provides");
                    assert.include(data[i], "srcdir");
                    assert.include(data[i], "is");
                    assert.include(data[i], "id");
                }
            }
        }
    }
}).addBatch({
    "Service APIs" : {
        "scheduler" : {
            topic:function() {
                var promise = new events.EventEmitter;
                var fired = false;

                try {
                    fs.unlinkSync("Me/testURLCallback/result.json");
                } catch (E) {
                    // Make sure it's file not found and throw others
                }
                locker.at("/write", 1);
                setTimeout(function() {
                    fs.stat("Me/testURLCallback/result.json", function(err, stats) {
                        if (!err)
                            promise.emit("success", true);
                        else
                            promise.emit("error", err);
                    });
                }, 1500);
                return promise;
            },
            "fires a scheduled callback":function(err, result) {
                assert.isNull(err);
                assert.isTrue(result);
            }
        },
        "events" : {
            topic:function() {
                var promise = new events.EventEmitter;
                var fired = false;
                
                try {
                    fs.unlinkSync("Me/testURLCallback/event.json");
                } catch (E) {
                    console.error(E);
                    // test the error?
                }
                locker.listen("test/event", "/event", function(err, resp, body) {
                    locker.event("test/event", {"test":"value"});
                    testUtils.waitForPathsToExist(["Me/testURLCallback/event.json"], 10, 1000, function(success) {
                        if(success)
                            promise.emit("success", true);
                        else
                            promise.emit("error", false);
                    });
                });
                return promise;
            },
            "fires an event callback": function(err, result) {
                assert.isNull(err);
                assert.isTrue(result);
            }
        }
    }
}).export(module);

