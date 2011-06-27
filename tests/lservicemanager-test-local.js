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

var normalPort = lconfig.lockerPort;
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
            "and can be spawned" : {
                topic:function() {
                    var promise = new events.EventEmitter();
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
                "successfully" : function(err, stat) {
                    assert.isNull(err);
                    assert.isTrue(stat);
                },
                "and can be shut down" : {
                    topic: function() {
                        var promise = new events.EventEmitter();
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
                    "successfully" : function (err, stat) {
                        assert.isNull(err);
                        assert.isTrue(stat);
                    }
                }
            }
        }
    },
    "Available services" : {
        "gathered from the filesystem" : {
            topic:serviceManager.scanDirectory("Connectors"),
            "found at least 10 services": function() {
                assert.ok(serviceManager.serviceMap().available.length > 10);
            },
            "and can be installed" : {
                topic:serviceManager.install({srcdir:"Connectors/Twitter"}),
                "by giving a valid install instance" : function(svcMetaInfo) {
                    assert.include(svcMetaInfo, "id");
                },
                "setting a version number" : function(svcMetaInfo) {
                    assert.isNotNull(svcMetaInfo.version);
                },
                "and by service map says it is installed" : function(svcMetaInfo) {
                    assert.isTrue(serviceManager.isInstalled(svcMetaInfo.id));
                },
                "and by creating a valid service instance directory" : function(svcMetaInfo) {
                    statInfo = fs.statSync(lconfig.me + "/" + svcMetaInfo.id);
                },
                "and by creating a valid auth.json file containing twitter auth info" : function(svcMetaInfo) {
                    statInfo = fs.readFileSync(lconfig.me + "/" + svcMetaInfo.id + "/auth.json",'ascii');
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
    },
    "Migrates services that need it during the install" : {
        topic: [],
        "changing their version" : function(topic) {
            assert.include(serviceManager.serviceMap().installed, "migration-test");
            assert.isTrue(serviceManager.isInstalled("migration-test"));
            assert.notEqual(serviceManager.serviceMap().installed['migration-test'], undefined);
            assert.notEqual(serviceManager.serviceMap().installed['migration-test'].version, undefined);
            assert.equal(serviceManager.serviceMap().installed['migration-test'].version, 1308079085972);
        },
        "and running the migration successfully" : function(topic) {
            var me = JSON.parse(fs.readFileSync(process.cwd() + "/" + lconfig.me + "/migration-test/me.json", 'ascii'));
            assert.notEqual(me.mongoCollections, undefined);
            assert.equal(me.mongoCollections[0], 'new_collection');
        }
    }
}).addBatch({
    "Spawning a service": {
        topic : function() {
            var that = this;
            request({url:lconfig.lockerBase + '/Me/echo-config/'}, that.callback);
        },
        "passes the externalBase with the process info": function(err, resp, body) {
            var json = JSON.parse(body);
            assert.equal(json.externalBase, lconfig.externalBase + '/Me/echo-config/');
        }
    }
}).export(module);

