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

vows.describe("Locker Client API").addBatch({
    "Initialization" : {
        "sets the base service URL" : function() {
            var baseURL = lconfig.lockerBase;
            locker.initClient({workingDirectory:"Me/testURLCallback", lockerUrl:"test"});
            assert.equal(lconfig.lockerBase, "test");
            locker.initClient({workingDirectory:"Me/testURLCallback", lockerUrl:baseURL});
        }
    }
}).addBatch({
    "Public APIs" : {
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
    }
}).addBatch({
    "Service APIs" : {
        "scheduler" : {
            topic:function() {
                var promise = new events.EventEmitter;
                var fired = false;

                try {
                    fs.unlinkSync("../Me/testURLCallback/result.json");
                } catch (E) {
                    // Make sure it's file not found and throw others
                }
                locker.at("/write", 1);
                setTimeout(function() {
                    fs.stat("../Me/testURLCallback/result.json", function(err, stats) {
                        if (!err)
                            promise.emit("success", true);
                        else
                            promise.emit("error", err);
                    });
                }, 1500);
                return promise;
            },
            "fires an event":function(err, result) {
                assert.isNull(err);
                assert.isTrue(result);
            }
        }
    }
}).export(module);

