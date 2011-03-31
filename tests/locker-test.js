var assert = require("assert");
var vows = require("vows");
var RESTeasy = require("rest-easy");
var http = require("http");
var querystring = require("querystring");
var events = require("events");
var fs = require("fs");


var suite = RESTeasy.describe("Locker core API")

suite.use("localhost", 8042)
    .discuss("When using the core you can")

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
            .expect("has 12 available services", function(err, res, body) {
                var map = JSON.parse(body);
                assert.equal(map.available.length, 12);
            }).expect("has 1 installed service", function(err, res, body) {
                var map = JSON.parse(body);
                assert.include(map.installed, "testURLCallback");
            })
    .unpath().undiscuss()

    .discuss("install an available service")
        .path("/install")
        /************
         * XXX Right now we're relying on the hello world application to exist, maybe we should make a testing app?
         */
        .post('', '{"title":"Hello World","action":"not much","desc":"just sayin hi and all","run":"node hello.js","srcdir":"Apps/HelloWorld","is":"app"}')
            .expect(200)
            .expect("and returns the installed service information", function(err, res, body) {
                console.log(body);
            });

suite.next().suite.addBatch({
    "can schedule a uri callback" : {
        topic:function() {
            var promise = new events.EventEmitter;
            var when = new Date;
            when.setTime(when.getTime() + 250);
            var options = {
                host:"localhost",
                port:8042,
                path:"/at?" + querystring.stringify({at:when.getTime()/1000,id:"testURLCallback",cb:"/"}) 
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
            }).on("error", function(e) {
                promise.emit("error", e);
            });
            return promise;
        },
        "and is called":function(err, stat) {
            assert.isNull(err);
        }
    }
});

suite.export(module);
