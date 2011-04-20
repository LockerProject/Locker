/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var assert = require("assert");
var vows = require("vows");
var RESTeasy = require("api-easy");
var http = require("http");
var request = require('request');
var querystring = require("querystring");
var events = require("events");
var fs = require("fs");


var tests = RESTeasy.describe("Locker core API")

tests.use("localhost", 8042)
    .discuss("Core can")
    .discuss("map existing services with")
        .path("/map")
        .get()
            .expect(200)
            .expect("has an available and installed attribute", function(err, res, body) {
                assert.isNull(err);
                var map = JSON.parse(body);
                assert.include(map, "available");
                assert.include(map, "installed");
                serviceMap = map;
            })
            .expect("has 17 available services", function(err, res, body) {
                var map = JSON.parse(body);
                assert.equal(map.available.length, 17);
            }).expect("has 12 installed services", function(err, res, body) {
                var map = JSON.parse(body);
                var count = 0;
                for (var key in map.installed) {
                    if (map.installed.hasOwnProperty(key)) ++count;
                }
                assert.equal(count, 12);
            }).expect("has the required test services installed", function(err, res, body) {
                var map = JSON.parse(body);
                assert.include(map.installed, "testURLCallback");
                // Add statements here to test for services required to test
            })
    .unpath().undiscuss()

    .discuss("list services providing a specific type")
        .path("/providers")
        .get("", {types:"testtype/testproviders"})
            .expect(200)
            .expect("and return an array of length 1 of valid services", function(err, res, body) {
                assert.equal(res.statusCode, 200);
                assert.isNotNull(body);
                var providers = JSON.parse(body);
                assert.equal(providers.length, 1);
                assert.equal(providers[0].title, "Test /providers");
            })
        .get("", {types:"badtype/badsvc"})
            .expect(200)
            .expect("and return an empty array", function(err, res, body) {
                assert.equal(res.statusCode, 200);
                assert.isNotNull(body);
                var providers = JSON.parse(body);
                assert.equal(providers.length, 0);
            })
        .get("", {types:"testtype/testproviders,testtype/anotherprovider"})
            .expect(200)
            .expect("and return an array of valid services", function(err, res, body) {
                assert.equal(res.statusCode, 200);
                assert.isNotNull(body);
                var providers = JSON.parse(body);
                assert.equal(providers.length, 2);
          }) 
        .get("", {types:"testtype"})
            .expect(200)
            .expect("and return an array of length 2", function(err, res, body) {
                assert.equal(res.statusCode, 200);
                assert.isNotNull(body);
                var providers = JSON.parse(body);
                assert.equal(providers.length, 2);
            })
        .unpath()
    .undiscuss()

    .path("/install")
    .discuss("install an available service")
        /************
         * XXX Right now we're relying on the hello world application to exist, maybe we should make a testing app?
         */
        .setHeader("Content-Type", "application/json")
        .discuss("but requires a srcdir attribute")
            .post({"invalid":"invalid"})
                .expect(400)
        .undiscuss()
        .discuss("and fails on an invalid service")
            .post({"srcdir":"invalid"})
                .expect(404)
        .undiscuss()
        .discuss("by srcdir attribute")
            .post({"srcdir":"Apps/HelloWorld"})
                .expect(200)
                .expect("and returns the installed service information", function(err, res, body) {
                    var svcInfo = JSON.parse(body);
                    assert.include(svcInfo, "id");
                    assert.include(svcInfo, "uri");
                })
                .expect("and has a created instance directory", function(err, res, body) {
                    var svcInfo = JSON.parse(body);
                    fs.statSync("../Me/" + svcInfo.id + "/me.json").isFile();
                })
        .undiscuss()
    .undiscuss().unpath()

    // Tests for the proxying
    .path("/Me")
    .discuss("proxy requests via GET to services")
        .get("testURLCallback/test")
            .expect(200)
            .expect({url:"/test", method:"GET"})
        .get("invalidServicename/test")
            .expect(404)
    .undiscuss().unpath()

    .path("/Me")
    .discuss("proxy requests via POST to services")
        .post("testURLCallback/test", {test:"test"})
            .expect(200)
            .expect({url:"/test", method:"POST"})
        .post("invalidServicename/test")
            .expect(404)
    .undiscuss().unpath()

    .discuss("proxy handles Unicode ")
        .path("/Me/testUnicode/test")
            .get()
                .expect(200)
                .expect("returned unicode JSON should be parsable", function(err, res, body) {
                    try {
                        var json = JSON.parse(body);
                    } catch(err) {
                        throw new Error('Could not parse json correctly: ' + body);
                    }
                    assert.isNotNull(json);
                })
        .unpath()
    .undiscuss()
    
    .discuss("proxy passes cookies through")
        .path("/Me/testCookies/test")
            .get()
                .expect(200)
                .expect("should pass a set-cookie header", function(err, res, body) {
                    assert.isNull(err);
                    assert.include(res.headers, "set-cookie");
                })
        .unpath()
    .undiscuss()
    
    // Diary storage
    .path("/testURLCallback/diary")
    .discuss("store diary messages")
        .post({level:2, message:"Test message"})
            .expect(200)
    .undiscuss().unpath()

    // Event basics
    .path("/testURLCallback/listen")
    .discuss("register a listener for an event")
        .get({type:"test/event2", cb:"/event"})
            .expect(200)
    .undiscuss().unpath();


// These tests are dependent on the previous tests so we make sure they fire after them
tests.next()
    // Test this after the main suite so we're sure the diary POST is done
    .discuss("retrieve stored diary messages")
    .path("/diary")
    .get()
        .expect(200)
        .expect("that have full info", function(err, res, body) {
            var diaryLine = JSON.parse(body);
            assert.include(diaryLine, "message");
            assert.include(diaryLine, "level");
            assert.include(diaryLine, "timestamp");
        })
    .undiscuss().unpath()

    // Makes sure the /listen is done first
    .path("/testURLCallback/deafen")
    .discuss("deafen a listener for an event")
        .get({type:"test/event2", cb:"/event"})
            .expect(200)
    .undiscuss().unpath();

// These tests are written in normal Vows
tests.next().suite.addBatch({
    "Core can schedule a uri callback" : {
        topic:function() {
            var promise = new events.EventEmitter;
            var when = new Date;
            when.setTime(when.getTime() + 250);
            var options = {
                host:"localhost",
                port:8042,
                path:"/testURLCallback/at?" + querystring.stringify({at:when.getTime()/1000,cb:"/write"}) 
            };
            try {
                fs.unlinkSync("../Me/testURLCallback/result.json");
            } catch (E) {
            }
            http.get(options, function(res) {
                setTimeout(function() {
                    fs.stat("../Me/testURLCallback/result.json", function(err, stats) {
                        if (!err)
                            promise.emit("success", true);
                        else
                            promise.emit("error", err);
                    });
                }, 500);
            }).on('data', function(chunk) {
                
            }).on("error", function(e) {
                promise.emit("error", e);
            });
            return promise;
        },
        "and is called":function(err, stat) {
            assert.isNull(err);
        }
    },
    "Core can fire an event" : {
        topic:function() {
            var promise = new events.EventEmitter;
            var getOptions = {
                host:"localhost",
                port:8042,
                path:"/testURLCallback/listen?" + querystring.stringify({type:"test/event", cb:"/event"})
            };
            var req = http.get(getOptions, function(res) {
                var options = {
                    host:"localhost",
                    port:8042,
                    method:"POST",
                    path:"/testURLCallback/event",
                    headers:{
                        "Content-Type":"application/json"
                    }
                };
                try {
                    fs.unlinkSync("../Me/testURLCallback/event.json");
                } catch (E) {
                }
                var req = http.request(options);
                req.on("response", function(res) {
                    setTimeout(function() {
                        fs.stat("../Me/testURLCallback/event.json", function(err, stats) {
                            if (!err)
                                promise.emit("success", true);
                            else
                                promise.emit("error", err);
                        });
                    }, 1000);
                });
                req.on("error", function(e) {
                    console.log("Error from request");
                    promise.emit("error", e);
                });
                req.write(JSON.stringify({type:"test/event",obj:{test:"value", result:true}}));
                req.end();
            }).on("error", function(e) {
                promise.emit("error", e);
            });
            return promise;
        },
        "and callbacks are called":function(err, stat) {
            assert.isNull(err);
        }
    }
});

tests.export(module);
