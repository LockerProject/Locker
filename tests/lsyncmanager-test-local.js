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

var syncManager = require("lsyncmanager.js");
var start;

vows.describe("Synclet Manager").addBatch({
    "Installed services can be executed immediately rather than waiting for next run" : {
        topic:function() {
            start = Date.now() - 1;
            syncManager.syncNow("testSynclet", this.callback);
        },
        "successfully" : function(err, status) {
            assert.isNull(err);
        }
    }
}).addBatch({
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
}).export(module);
