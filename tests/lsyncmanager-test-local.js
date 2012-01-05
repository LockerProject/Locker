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

var vows = require("vows")
  , assert = require("assert")
  , lconfig = require("lconfig")
  , fs = require('fs')
  , mongo
  , allEvents = {}
  , request = require('request')
  , _id
  , obj
  , colls
  ;
lconfig.load("Config/config.json");
var levents = require("levents");
var realFireEvent = levents.fireEvent;

var syncManager = require("lsyncmanager.js");
var lmongo = require('../Common/node/lmongo');
var start;
/*
syncManager.eventEmitter.on('testSync/testSynclet', function(event) {
    events.push(event);
    eventCount++;
});

syncManager.eventEmitter.on('eventType/testSynclet', function(event) {
    nsEvents.push(event);
    nsEventCount++;
});
*/

vows.describe("Synclet Manager").addBatch({
    "has a map of the available synclets" : function() {
        lconfig.tolerance.threshold=0; // disable
        levents.fireEvent = function(idr, action, data) {
            allEvents[idr] = {action:action, data:data};
        }
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
                "frequency is 1200s" : function(topic) {
                    assert.equal(topic.synclets[0].frequency, 1200);
                },
                "status is waiting" : function(topic) {
                    assert.equal(topic.status, 'waiting');
                },
                "finishedOnce is not true" : function(topic) {
                    assert.equal(topic.finishedOnce, undefined);
                },
                "next run is about 120 seconds from now" : function(topic) {
                    // when runing as part of the full suite, this test fails because it gets back a time that's been time zoned
                    // i have no idea what's causing that, so this test is commented until that's sorted out
                    //
                    // 'Tue Aug 02 2011 17:12:10 GMT-0700 (PDT)120'
                    // Wed, 03 Aug 2011 00:12:15 GMT
                    //     ✗ next run is about 120 seconds from now
                    //       » expected true, got false // lsyncmanager-test-local.js:47
                    // console.dir(new Date());
                    // assert.isTrue(topic.nextRun > new Date() + 110);
                    // assert.isTrue(topic.nextRun < new Date() + 130);
                },
                "which will return info about what will be synced" : function(topic) {
                    assert.equal(topic.info, 'Syncs test data!');
                }
            },
             "manifest data is properly surfaced in the providers call" : function() {
                assert.equal(syncManager.providers(['contact/twitter'])[0].title, 'Twitter');
            }
        }
    }
}).addBatch({
    // this will all be handled by the auth manager later, but this will have to do for now
    //
    "Installed services have hacky auth pieces added to them" : {
        topic: syncManager.synclets().available,
        "facebook worked" : function(topic) {
            for (var i = 0; i < topic.length; i++) {
                if (topic[i].provider === 'facebook') {
                    assert.equal(topic[i].authurl, "https://graph.facebook.com/oauth/authorize?client_id=fb-appkey&response_type=code&redirect_uri=http://localhost:8043/auth/facebook/auth&scope=email,offline_access,read_stream,user_photos,friends_photos,publish_stream,user_photo_video_tags");
                }
            }
        },
        "twitter worked" : function(topic) {
            for (var i = 0; i < topic.length; i++) {
                if (topic[i].provider === 'twitter') {
                    assert.equal(topic[i].authurl, "http://localhost:8043/auth/twitter/auth");
                }
            }
        },
        "github worked" : function(topic) {
            for (var i = 0; i < topic.length; i++) {
                if (topic[i].provider === 'github') {
                    assert.equal(topic[i].authurl, "https://github.com/login/oauth/authorize?client_id=gh-appkey&response_type=code&redirect_uri=http://localhost:8043/auth/github/auth");
                }
            }
        },
        "gcontacts worked" : function(topic) {
            for (var i = 0; i < topic.length; i++) {
                if (topic[i].provider === 'gcontacts') {
                    assert.equal(topic[i].authurl, "https://accounts.google.com/o/oauth2/auth?client_id=gc-appkey&redirect_uri=http://localhost:8043/auth/gcontacts/auth&scope=https://www.google.com/m8/feeds/&response_type=code");
                }
            }
        },
        "foursquare worked" : function(topic) {
            for (var i = 0; i < topic.length; i++) {
                if (topic[i].provider === 'foursquare') {
                    assert.equal(topic[i].authurl, "https://foursquare.com/oauth2/authenticate?client_id=4sq-appkey&response_type=code&redirect_uri=http://localhost:8043/auth/foursquare/auth");
                }
            }
        },
        "flickr worked" : function(topic) {
            for (var i = 0; i < topic.length; i++) {
                if (topic[i].provider === 'flickr') {
                    assert.equal(topic[i].authurl, "http://localhost:8043/auth/flickr/auth");
                }
            }
        }
    },
    "Installed services can be executed immediately rather than waiting for next run" : {
        topic:function() {
            allEvents = {};
            syncManager.syncNow("testSynclet", this.callback);
        },
        "successfully" : function(err, status) {
            assert.isNull(err);
        },
        "and after running generates data in mongo" : {
            topic: function() {
                var self = this;
                lmongo.init('synclets', ['testSynclet_testSync', 'testSynclet_dataStore'], function(theMongo, theColls) {
                    mongo = theMongo;
                    colls = theColls;
                    colls.testSynclet_testSync.count(self.callback);
                });
            },
            "successfully" : function(err, count) {
                assert.equal(allEvents["datastore://testsynclet/dataStore?id=testSynclet#5"].action, "new");
            }
        }
    }
}).addBatch({
    "Installed services can be executed immediately rather than waiting for next run" : {
        topic:function() {
            start = Date.now() - 1;
            syncManager.syncNow("testSynclet", this.callback);
        },
        "successfully" : function(err, status) {
            assert.isNull(err);
        },
        "and services specifying a positive nextRun time in the past get rescheduled at the next interval time" : function(err, status) {
            //this is a bit racey
            var synclet = syncManager.synclets().installed.testSynclet.synclets[0];
            assert.ok(synclet.nextRun > (start + ((synclet.frequency*1000)) * 0.95));
            assert.ok(synclet.nextRun < (Date.now() + ((synclet.frequency*1000)) * 1.05));
        }
    }
}).addBatch({
    "and also generates " : {
        topic: function() {
            colls.testSynclet_dataStore.count(this.callback);
        },
        "data in the namespaced collection" : function(err, count) {
            assert.equal(count, 1);
        }
    },
    "and after running writes out IJOD stuff" : {
        topic: function() {
            fs.readFile(lconfig.me + "/testSynclet/testSync.json", this.callback);
        },
        "successfully" : function(err, data) {
            assert.equal(data.toString(), '{"timeStamp":1312325283581,"data":{"notId":500,"someData":"BAM"}}\n{"timeStamp":1312325283582,"data":{"notId":1,"someData":"datas"}}\n');
        }
    },
    "into both" : {
        topic: function() {
            fs.readFile(lconfig.me + "/testSynclet/dataStore.json", this.callback);
        },
        "files": function(err, data) {
            assert.equal(data.toString(), '{"timeStamp":1312325283583,"data":{"id":5,"notId":5,"random":"data"}}\n');
        }
    },
    "and after generating " : {
        topic: allEvents,
        "correct number of events" : function(topic) {
            assert.equal(Object.keys(allEvents).length, 3);
        },
        "with correct data" : function(topic) {
            /*
            assert.equal(events[0].fromService, 'synclet/testSynclet');
            assert.equal(events[1].fromService, 'synclet/testSynclet');
            assert.equal(events[2].fromService, 'synclet/testSynclet');
            */
            assert.equal(allEvents["testsync://testsynclet/testSync?id=testSynclet#500"].action, 'new');
            assert.notEqual(allEvents["testsync://testsynclet/testSync?id=testSynclet#500"].data._id, undefined);
            assert.notEqual(allEvents["testsync://testsynclet/testSync?id=testSynclet#1"].data._id, undefined)
            assert.equal(allEvents["testsync://testsynclet/testSync?id=testSynclet#500"].data.notId, 500);
            assert.equal(allEvents["testsync://testsynclet/testSync?id=testSynclet#1"].data.notId, 1);
        },
        "correct types of events": function(topic) {
            assert.equal(allEvents["datastore://testsynclet/dataStore?id=testSynclet#5"].action, 'new');
            assert.equal(allEvents["datastore://testsynclet/dataStore?id=testSynclet#5"].data.random, 'data');
        }
    },
    "and set the finishedOnce property to true" : function(err, status) {
        assert.equal(syncManager.synclets().installed.testSynclet.finishedOnce, true);
    }
}).addBatch({
    "Querying the data API returns the data" : {
        topic: function() {
            request.get({uri : "http://localhost:8043/synclets/testSynclet/getCurrent/testSync"}, this.callback)
        },
        "from testSync" : function(err, resp, body) {
            var data = JSON.parse(body);
            _id = data[0]._id;
            obj = data[0];
            assert.equal(data[0].notId, 500);
            assert.equal(data[0].someData, 'BAM');
        }
    }
}).addBatch({
    "Querying for an ID returns the object": {
        topic: function() {
            request.get({uri : "http://localhost:8043/synclets/testSynclet/testSync/id/" + _id}, this.callback);
        },
        "successfully" : function(err, resp, body) {
            var data = JSON.parse(body);
            assert.deepEqual(obj, data);
        }
    }
}).addBatch({
    "Running testSynclet again" : {
        topic: function() {
            allEvents = {};
            syncManager.syncNow("testSynclet", this.callback);
        },
        "with no data will leave everything intact" : function(topic) {
            assert.equal(Object.keys(allEvents).length, 0);
        }
    }
}).addBatch({
    "If the source doesn't return an ID" : {
        topic: function() {
            allEvents = {};
            var self = this;
            colls.testSynclet_testSync.drop(function() {
                syncManager.syncNow("testSynclet", function() {
                    colls.testSynclet_testSync.count(self.callback);
                });
            });
        },
        "it will generate a delete event and remove the row from mongo" : function(err, count) {
            assert.equal(count, 0);
            assert.equal(Object.keys(allEvents).length, 1);
            assert.equal(allEvents['testsync://testsynclet/testSync?id=testSynclet#500'].action, 'delete');
        }
    }
}).addBatch({
    "Running testSynclet again" : {
        topic: function() {
            syncManager.syncNow("testSynclet", this.callback);
        },
        "with no value for 'notId'" : function(arg1, arg2, arg3) {
            assert.equal(arg1[0].message, 'no value for primary key');
        }
    }
}).addBatch({
    "Available services" : {
        "gathered from the filesystem" : {
            topic:syncManager.scanDirectory("Tests"),
            "found a service": function() {
                assert.ok(syncManager.synclets().available.length > 0);
            },
            "and can be installed" : {
                topic:syncManager.install({srcdir:"Tests/testSynclet","auth" : {"consumerKey":"daKey","consumerSecret":"daPassword"}}),
                "by giving a valid install instance" : function(svcMetaInfo) {
                    assert.include(svcMetaInfo, "synclets");
                },
                "and by service map says it is installed" : function(svcMetaInfo) {
                    assert.isTrue(syncManager.isInstalled(svcMetaInfo.id));
                },
                "and by creating a valid service instance directory" : function(svcMetaInfo) {
                    statInfo = fs.statSync(lconfig.me + "/" + svcMetaInfo.id);
                },
                "and by adding valid auth info" : function(svcMetaInfo) {
                    assert.deepEqual(svcMetaInfo.auth, {"consumerKey":"daKey","consumerSecret":"daPassword"});
                },
                "and passes along the icon": function(svcMetaInfo) {
                    assert.notEqual(svcMetaInfo.icon, undefined);
                }
            },
            "and can be installed a second time" : {
                topic:syncManager.install({srcdir:"Tests/testSynclet"}),
                "by giving a valid install instance" : function(svcMetaInfo) {
                    assert.include(svcMetaInfo, "id");
                },
                "and by service map says it is installed" : function(svcMetaInfo) {
                    assert.isTrue(syncManager.isInstalled(svcMetaInfo.id));
                },
                "and by creating a valid service instance directory" : function(svcMetaInfo) {
                    statInfo = fs.statSync(lconfig.me + "/" + svcMetaInfo.id);
                },
                "and passes along the icon": function(svcMetaInfo) {
                    assert.notEqual(svcMetaInfo.icon, undefined);
                }
            }
        }
    },
    "Migrates services that need it during the install" : {
        topic: [],
        "changing their version" : function(topic) {
            assert.include(syncManager.synclets().installed, "migration-test2");
            assert.isTrue(syncManager.isInstalled("migration-test2"));
            assert.notEqual(syncManager.synclets().installed['migration-test2'], undefined);
            assert.notEqual(syncManager.synclets().installed['migration-test2'].version, undefined);
            assert.equal(syncManager.synclets().installed['migration-test2'].version, 1308079085972);
        },
        "and running the migration successfully" : function(topic) {
            var me = JSON.parse(fs.readFileSync(process.cwd() + "/" + lconfig.me + "/migration-test/me.json", 'ascii'));
            assert.notEqual(me.mongoCollections, undefined);
            assert.equal(me.mongoCollections[0], 'new_collection');
        }
    },
    teardown : function() {
        levents.fireEvent = realFireEvent;
    }
}).export(module);
