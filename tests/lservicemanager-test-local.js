/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/*
* Tests the acutal implementation of the lservicemanager.  
* See locker-core-ap-test.js for a test of the REST API interface to it.
*/
var vows = require("vows");
var assert = require("assert");
var fs = require("fs");
var util = require("util");
var events = require("events");
var request = require("request");
var testUtils = require(__dirname + "/test-utils.js");
require.paths.push(__dirname + "/../Common/node");
var serviceManager = require("lservicemanager.js");
var lconfig = require("lconfig");
lconfig.load("config.json");

vows.describe("Service Manager").addBatch({
    "has a map of the available services" : function() {
        assert.include(serviceManager, "serviceMap");
        assert.include(serviceManager.serviceMap(), "available");
        assert.include(serviceManager.serviceMap(), "installed");
    },
    "Installed services" : {
        "are found" : {
            topic:serviceManager.findInstalled(),
            "and testURLCallback exists": function() {
                assert.include(serviceManager.serviceMap().installed, "testURLCallback");
                assert.isTrue(serviceManager.isInstalled("testURLCallback"));
            },
            topic:function() {
                var promise = new(events.EventEmitter);
                var started = false;
                serviceManager.spawn("testURLCallback", function() {
                    started = true;
                });
                setTimeout(function() {
                    if (started) {
                        promise.emit("success", true);
                    } else {
                        promise.emit("error", false);
                    }
                }, 500);
                return promise;
            },
            "and can be spawned" : function(err, stat) {
                assert.isNull(err);
                assert.isTrue(stat);
            },
            topic: function() {
                var promise = new(events.EventEmitter);
                var shutdownComplete = false;
                serviceManager.shutdown(function() {
                    shutdownComplete = true;
                });
                setTimeout(function() {
                    if (shutdownComplete) promise.emit("success", true);
                    else promise.emit("error", false);
                }, 1000);
                return promise;
            },
            "and can be shutdown" : function (err, stat) {
                assert.isNull(err);
                assert.isTrue(stat);
            }
        }
    },
    "Unstable services aren't listed if " : {
        topic: function() {
            serviceManager.serviceMap().available = [];
            lconfig.displayUnstable = false;
            lconfig.scannedDirs.forEach(function(dirToScan) {
                var installable = true;
                if (dirToScan === "Collections") installable = false;
                serviceManager.scanDirectory(dirToScan, installable);
            });
            return "topic";
        },
        "not set to display them" : function(topic) {
            for (var i = 0; i < serviceManager.serviceMap().available.length; i++) {
                assert.equal(serviceManager.serviceMap().available[i].status, "stable");
            }
        },
        "reset afterwards" : function(topic) {
            serviceManager.serviceMap().available = [];
            lconfig.displayUnstable = true;
            lconfig.scannedDirs.forEach(function(dirToScan) {
                var installable = true;
                if (dirToScan === "Collections") installable = false;
                serviceManager.scanDirectory(dirToScan, installable);
            });
        }
    },
    "Available services" : {
        "gathered from the filesystem" : {
            topic:serviceManager.scanDirectory("Connectors"),
            "gathered at least 10 services": function() {
                assert.ok(serviceManager.serviceMap().available.length > 10);
            },
            topic:serviceManager.install({srcdir:"Connectors/Twitter"}),
            "can be installed" : {
                "giving a valid install instance" : function(svcMetaInfo) {
                    assert.include(svcMetaInfo, "id");
                },
                "service map says it is installed" : function(svcMetaInfo) {
                    assert.isTrue(serviceManager.isInstalled(svcMetaInfo.id));
                },
                "creates a valid service instance directory" : function(svcMetaInfo) {
                    statInfo = fs.statSync("Me/" + svcMetaInfo.id);
                },
                "creates a valid auth.json file containing twitter auth info" : function(svcMetaInfo) {
                    statInfo = fs.readFileSync("Me/" + svcMetaInfo.id + "/auth.json",'ascii');
                    assert.equal(statInfo, '{"consumerKey":"daKey","consumerSecret":"daPassword"}');
                }
            }
        }
    },
    "Collections" : {
        "are preinstalled" : function() {
            assert.includes(serviceManager.serviceMap().installed, "contacts");
        },
        topic:serviceManager.install({srcdir:"Collections/Contacts"}),
        "are not installable" : function(svcInfo) {
            assert.isUndefined(svcInfo);
        }
    }
}).export(module);

