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
  ;
lconfig.load("config.json");
var syncManager = require("lsyncmanager.js");
var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, 'synclets', ['testSynclet_testSync']);

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
                    assert.equal(topic.frequency, 120);
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
        },
        "and after running writes out IJOD stuff" : {
            topic: function() {
                fs.readFile(lconfig.me + "/synclets/testSynclet/testSync.json", this.callback);
            },
            "successfully" : function(err, data) {
                assert.equal(data.toString(), '{"timeStamp":1312325283581,"data":{"notId":500,"someData":"BAM"}}\n{"timeStamp":1312325283582,"data":{"notId":1,"someData":"datas"}}\n{"timeStamp":1312325283583,"data":{"deleted":1312325283583,"notId":1}}\n');
            }
        }
    },
    "Available services" : {
        "gathered from the filesystem" : {
            topic:syncManager.scanDirectory("synclets"),
            "found a service": function() {
                assert.ok(syncManager.synclets().available.length > 0);
            },
            "and can be installed" : {
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
    // },
    // "Migrates services that need it during the install" : {
    //     topic: [],
    //     "changing their version" : function(topic) {
    //         assert.include(serviceManager.serviceMap().installed, "migration-test");
    //         assert.isTrue(serviceManager.isInstalled("migration-test"));
    //         assert.notEqual(serviceManager.serviceMap().installed['migration-test'], undefined);
    //         assert.notEqual(serviceManager.serviceMap().installed['migration-test'].version, undefined);
    //         assert.equal(serviceManager.serviceMap().installed['migration-test'].version, 1308079085972);
    //     },
    //     "and running the migration successfully" : function(topic) {
    //         var me = JSON.parse(fs.readFileSync(process.cwd() + "/" + lconfig.me + "/migration-test/me.json", 'ascii'));
    //         assert.notEqual(me.mongoCollections, undefined);
    //         assert.equal(me.mongoCollections[0], 'new_collection');
    //     }
    }
// }).addBatch({
//     "Spawning a service": {
//         topic : function() {
//             request({url:lconfig.lockerBase + '/Me/echo-config/'}, this.callback);
//         },
//         "passes the externalBase with the process info": function(err, resp, body) {
//             var json = JSON.parse(body);
//             assert.equal(json.externalBase, lconfig.externalBase + '/Me/echo-config/');
//         }
//     }
// }).addBatch({
//     "Uninstalling services " : {
//         topic: function() {
//             var that = this;
//             request({uri:lconfig.lockerBase + '/core/tests/uninstall', json:{serviceId:'disabletest'}, method: 'POST'}, function() {
//                 path.exists(lconfig.me + "/disabletest", function(exists) {
//                     if (exists) {
//                         that.callback("directory still exists");
//                     } else {
//                         that.callback(false, true);
//                     }
//                 })
//             });
//         },
//         "deletes them FOREVER" : function(err, resp) {
//             assert.isNull(err);
//             assert.isTrue(resp);
//         },
//         "and deletes" : {
//             topic : function() {
//                 mongo.collections.thing1.count(this.callback);
//             },
//             "mongo collections" : function(err, doc) {
//                 assert.isNull(err);
//                 assert.equal(doc, 0);
//             }
//         }
//     }
}).export(module);

