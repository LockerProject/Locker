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
var lconfig = require('../Common/node/lconfig.js');

lconfig.load('Config/config.json');

var tests = RESTeasy.describe("Locker core API");

tests.use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Core can")
    .discuss("map existing services with")
        .path("/map")
        .get()
            .expect(200)
            .expect("has stuff", function(err, res, body) {
                assert.isNull(err);
                var map = JSON.parse(body);
                assert.include(map, "testURLCallback");
                serviceMap = map;
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


tests.next()
    .path("/Me")
    .discuss("not spawn an invalid service")
        .get("/spawn-invalid/")
            .expect(404)
    .undiscuss().unpath()
tests.next()
    // Tests for the proxying
    .path("/Me")
    .discuss("proxy requests via GET to services")
        .get("testURLCallback/test")
            .expect(200)
            .expect({url:"/test", method:"GET"})
    .undiscuss().unpath()
tests.next()
    // Tests for the proxying
    .path("/Me")
    .discuss("proxy requests via GET to services")
        .get("invalidServicename/test")
            .expect(404)
    .undiscuss().unpath()
tests.next()
    .path("/Me")
    .discuss("proxy requests via POST to invalid services")
        .post("invalidServicename/test")
            .expect(404)
    .undiscuss().unpath()
tests.next()
    .discuss("proxy handles Unicode ")
        .path("/Me/testUnicode/test")
            .get()
                .expect(200)
                .expect("returned unicode JSON should be parsable", function(err, res, body) {
                    var json;
                    try {
                        json = JSON.parse(body);
                    } catch(E) {
                        throw new Error('Could not parse json correctly: ' + body);
                    }
                    assert.isNotNull(json);
                })
        .unpath()
    .undiscuss().unpath()
tests.next()
    // Diary storage
    .path("/core/testURLCallback/diary?" + querystring.stringify({level:2, message:"Test message"}))
    .discuss("store diary messages")
        .get()
            .expect(200)
    .undiscuss().unpath()
tests.next()
    .path("/core/revision")
    .discuss("returns a revision if git is available")
        .get()
            .expect(200)
            .expect("didn't get an 'unknown' response", function(err, res, body) {
                assert.notEqual(body, "unknown");
            })
        .unpath()
    .undiscuss().unpath()
tests.next()
tests.next()
    .path("/core/stats")
    .discuss("return statistics")
        .get()
            .expect(200)
    .undiscuss().unpath()

    // Event basics
    .path("/core/testURLCallback/listen?" + querystring.stringify({type:"test/event2", cb:"/event"}))
    .discuss("register a listener for an event")
        .get()
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
            var diaryLine = JSON.parse(body)[0];
            assert.include(diaryLine, "message");
            assert.include(diaryLine, "level");
            assert.include(diaryLine, "timestamp");
        })
    .undiscuss().unpath()

    // Makes sure the /listen is done first
    .path("/core/testURLCallback/deafen?" + querystring.stringify({type:"test/event2", cb:"/event"}))
    .discuss("deafen a listener for an event")
        .get()
            .expect(200)
    .undiscuss().unpath();

// These tests are written in normal Vows
tests.next().suite.addBatch({
    "Core can schedule a uri callback" : {
        topic:function() {
            var promise = new events.EventEmitter();
            var when = new Date();
            when.setTime(when.getTime() + 250);
            var options = {
                host:lconfig.lockerHost,
                port:lconfig.lockerPort,
                path:"/core/testURLCallback/at?" + querystring.stringify({at:when.getTime()/1000,cb:"/write"})
            };
            try {
                fs.unlinkSync(lconfig.me + "/testURLCallback/result.json");
            } catch (E) {
            }
            http.get(options, function(res) {
                setTimeout(function() {
                    fs.stat(lconfig.me + "/testURLCallback/result.json", function(err, stats) {
                        if (!err)
                            promise.emit("success", true);
                        else
                            promise.emit("error", err);
                    });
                }, 1500);
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
            var promise = new events.EventEmitter();
            var getOptions = {
                host:lconfig.lockerHost,
                port:lconfig.lockerPort,
                path:"/core/testURLCallback/listen?" + querystring.stringify({type:"test/event", cb:"/event"})
            };
            var req = http.get(getOptions, function(res) {
                var options = {
                    host:lconfig.lockerHost,
                    port:lconfig.lockerPort,
                    method:"POST",
                    path:"/core/testURLCallback/event",
                    headers:{
                        "Content-Type":"application/json"
                    }
                };
                try {
                    fs.unlinkSync(lconfig.me + "/testURLCallback/event.json");
                } catch (E) {
                }
                var req = http.request(options);
                req.on("response", function(res) {
                    setTimeout(function() {
                        fs.stat(lconfig.me + "/testURLCallback/event.json", function(err, stats) {
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
                req.write(JSON.stringify({idr:"test://event",action:"new",data:{test:"value", result:true}}));
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
