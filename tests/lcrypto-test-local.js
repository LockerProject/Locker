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
var fs = require("fs");
var events = require("events");
var lcrypto = require("lcrypto");
var request = require("request");
var lconfig = require("lconfig");
var querystring = require("querystring");
lconfig.load("Config/config.json");

vows.describe("Crypto Wrapper").addBatch({
    "lcrypto" : {
        "symmetric key": {
            topic:function() {
                var promise = new events.EventEmitter;
                lcrypto.generateSymKey(function(result) {
                    promise.emit("success", result);
                });
                return promise;
            },
            "generates a symmetric key":function(err, result) {
                assert.isTrue(result);
            },
            "that can encrypt and decrypt data" : {
                topic:function(err, result) {
                    return lcrypto.decrypt(lcrypto.encrypt("a test string"));
                },
                "to the same value" : function(topic) {
                    assert.equal(topic, "a test string");
                }
            },
            "API endpoint": {
                topic:function() {
                    var promise = new events.EventEmitter;
                    request.get({url:lconfig.lockerBase + "/encrypt?" + querystring.stringify({s:"test"})}, function(error, result, body) {
                        if (error) {
                            promise.emit("error", error);
                            return;
                        }
                        request.get({url:lconfig.lockerBase + "/decrypt?" + querystring.stringify({s:body})}, function(error, result, body) {
                            if (error) {
                                promise.emit("error", error);
                                return;
                            }
                            promise.emit("success", body);
                        });
                    });

                    return promise;
                },
                "can encrypt and decrypt":function(err, res) {
                    assert.isNull(err);
                    assert.equal(res, "test");
                }
            }
        },
        topic:function() {
            var promise = new events.EventEmitter;
            lcrypto.generatePKKeys(function(result) {
                promise.emit("success", result);
            });
            return promise;
        },
        "generates pk pair":function(err, result) {
            assert.isTrue(result);
        }
    }
}).export(module);
