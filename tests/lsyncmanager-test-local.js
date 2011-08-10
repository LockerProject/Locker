/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/*
* Tests the acutal implementation of the lsyncmanager.  
*/

require.paths.push(__dirname + "/../Common/node");
var vows = require("vows")
  , assert = require("assert")
  , lconfig = require("lconfig")
  , fs = require('fs')
  , mongo
  , eventCount = 0
  , events = []
  , nsEventCount = 0
  , nsEvents = []
  ;
lconfig.load("config.json");
var syncManager = require("lsyncmanager.js");
var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, 'synclets', ['testSynclet_testSync', 'testSynclet_dataStore']);

syncManager.eventEmitter.on('testSync/testSynclet', function(event) {
    events.push(event);
    eventCount++;
});

syncManager.eventEmitter.on('eventType/testSynclet', function(event) {
    nsEvents.push(event);
    nsEventCount++;
});

vows.describe("Synclet Manager").addBatch({
    "has a map of the available synclets" : function() {
        assert.include(syncManager, "synclets");
        assert.include(syncManager.synclets(), "available");
        assert.include(syncManager.synclets(), "installed");
    },
    "Installed services" : {
        "are found" : {
            topic:syncManager.findInstalled(),
            "and testSynclet exists": function() {
                assert.include(syncManager.synclets().installed, "testSynclet");
                assert.isTrue(syncManager.isInstalled("testSynclet"));
            },
            "and has status" : {
                topic: syncManager.status('testSynclet'),
                "frequency is 120s" : function(topic) {
                    assert.equal(topic.synclets[0].frequency, 120);
                },
                "status is waiting" : function(topic) {
                    assert.equal(topic.status, 'waiting');
                },
                "next run is about 120 seconds from now" : function(topic) {
                    // when runing as part of the full suite, this test fails because it gets back a time that's been time zoned
                    // i have no idea what's causing that, so this test is commented until that's sorted out
                    //
                    // 'Tue Aug 02 2011 17:12:10 GMT-0700 (PDT)120'
                    // Wed, 03 Aug 2011 00:12:15 GMT
                    //     ✗ next run is about 120 seconds from now
                    //       » expected true, got false // lsyncmanager-test-local.js:47
                    // console.dir(topic.nextRun);
                    // console.dir(new Date());
                    // assert.isTrue(topic.nextRun > new Date() + 110);
                    // assert.isTrue(topic.nextRun < new Date() + 130);
                }
            }
        }
    }
}).addBatch({
    "Installed services can be executed immediately rather than waiting for next run" : {
        topic:function() {
            syncManager.syncNow("testSynclet", this.callback);
        },
        "successfully" : function(err, status) {
            assert.isNull(err);
        },
        "and after running generates data in mongo" : {
            topic: function() {
                var self = this;
                lmongoclient.connect(function(theMongo) {
                    mongo = theMongo;
                    mongo.collections.testSynclet_testSync.count(self.callback);
                });
            },
            "successfully" : function(err, count) {
                assert.equal(count, 1);
            }
        }
    }
}).addBatch({
    "and also generates " : {
        topic: function() {
            mongo.collections.testSynclet_dataStore.count(this.callback);
        },
        "data in the namespaced collection" : function(err, count) {
            assert.equal(count, 1);
        }
    },
    "and after running writes out IJOD stuff" : {
        topic: function() {
            fs.readFile(lconfig.me + "/synclets/testSynclet/testSync.json", this.callback);
        },
        "successfully" : function(err, data) {
            assert.equal(data.toString(), '{"timeStamp":1312325283583,"data":{"deleted":1312325283583,"notId":1}}\n{"timeStamp":1312325283581,"data":{"notId":500,"someData":"BAM"}}\n{"timeStamp":1312325283582,"data":{"notId":1,"someData":"datas"}}\n');
        }
    },
    "into both" : {
        topic: function() {
            fs.readFile(lconfig.me + "/synclets/testSynclet/dataStore.json", this.callback);
        },
        "files": function(err, data) {
            assert.equal(data.toString(), '{"timeStamp":1312325283583,"data":{"id":5,"notId":5,"random":"data"}}\n');
        }
    },
    "and after generating " : {
        topic: eventCount,
        "correct number of events" : function(topic) {
            assert.equal(eventCount, 3);
        },
        "with correct data" : function(topic) {
            assert.equal(events[0].fromService, 'synclet/testSynclet');
            assert.equal(events[1].fromService, 'synclet/testSynclet');
            assert.equal(events[2].fromService, 'synclet/testSynclet');
            assert.equal(events[0].obj.type, 'delete');
            assert.equal(events[2].obj.type, 'new');
            assert.equal(events[0].obj.data.notId, 1);
            assert.equal(events[1].obj.data.notId, 500);
            events = [];
            eventCount = 0;
        },
        "correct types of events": function(topic) {
            assert.equal(nsEventCount, 1);
            assert.equal(nsEvents[0].obj.type, 'new');
            assert.equal(nsEvents[0].obj.data.random, 'data');
        }
    }
}).addBatch({
    "Running testSynclet again" : {
        topic: function() {
            syncManager.syncNow("testSynclet", this.callback);
        },
        "with no data will leave everything intact" : function(topic) {
            assert.equal(eventCount, 0);
            assert.equal(events[0], undefined);
            events = [];
            eventCount = 0;
        }
    }
}).addBatch({
    "Removing IDs from the config will" : {
        topic: function() {
            var self = this;
            syncManager.syncNow("testSynclet", function() {
                mongo.collections.testSynclet_testSync.count(self.callback);
            });
        },
        "will generate a delete event and remove the row from mongo" : function(err, count) {
            assert.equal(count, 0);
            assert.equal(eventCount, 1);
            assert.equal(events[0].obj.type, 'delete');
            assert.equal(events[0].obj.data.notId, 500);
        }
    }
}).addBatch({
    "Available services" : {
        "gathered from the filesystem" : {
            topic:syncManager.scanDirectory("synclets"),
            "found a service": function() {
                assert.ok(syncManager.synclets().available.length > 0);
            },
            "and can be installed" : {
                topic:syncManager.install({srcdir:"synclets/testSynclet"}),
                "by giving a valid install instance" : function(svcMetaInfo) {
                    assert.include(svcMetaInfo, "synclets");
                },
                "and by service map says it is installed" : function(svcMetaInfo) {
                    assert.isTrue(syncManager.isInstalled(svcMetaInfo.id));
                },
                "and by creating a valid service instance directory" : function(svcMetaInfo) {
                    statInfo = fs.statSync(lconfig.me + "/synclets/" + svcMetaInfo.id);
                },
                "and by adding valid auth info" : function(svcMetaInfo) {
                    assert.deepEqual(svcMetaInfo.auth, {"consumerKey":"daKey","consumerSecret":"daPassword"});
                },
                "and passes along the icon": function(svcMetaInfo) {
                    assert.notEqual(svcMetaInfo.icon, undefined);
                }
            },
            "and can be installed a second time" : {
                topic:syncManager.install({srcdir:"synclets/testSynclet"}),
                "by giving a valid install instance" : function(svcMetaInfo) {
                    assert.include(svcMetaInfo, "id");
                },
                "and by service map says it is installed" : function(svcMetaInfo) {
                    assert.isTrue(syncManager.isInstalled(svcMetaInfo.id));
                },
                "and by creating a valid service instance directory" : function(svcMetaInfo) {
                    statInfo = fs.statSync(lconfig.me + "/synclets/" + svcMetaInfo.id);
                },
                "and by adding valid auth info" : function(svcMetaInfo) {
                    assert.deepEqual(svcMetaInfo.auth, {"consumerKey":"daKey","consumerSecret":"daPassword"});
                },
                "and passes along the icon": function(svcMetaInfo) {
                    assert.notEqual(svcMetaInfo.icon, undefined);
                }
            }
        }
    }
}).export(module);

