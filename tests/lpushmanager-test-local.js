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
  , path = require('path')
  , request = require('request')
  , events = []
  , eventCount = 0
  , events = []
  , dataSets = []
  ;

dataSets[0] = {"config" : { "ids" : [1, 500] },
               "data": [ { "obj" : {"id" : 500, "someData":"BAM"}, "type" : "new", "timestamp" : 1312325283581 },
                         {"obj" : {"id" : 1, "someData":"datas"}, "type" : "new", "timestamp" : 1312325283582 }]}
dataSets[1] = {"config" : {}, "data" : {}};
dataSets[2] = {"config" : { "ids" : [1] } };
dataSets[3] = {"data": [ { "obj" : {"notId" : 1}, "timestamp" : 1312325283583 } ]};
dataSets[4] = {"data": [ { "obj" : {"id" : 1}, "type" : "delete" } ]};


lconfig.load("Config/config.json");

var pushManager = require(__dirname + "/../Common/node/lpushmanager.js");

var levents = require("levents");
var realFireEvent = levents.fireEvent;

vows.describe("Push Manager").addBatch({
    "has a map of the data sets" : function() {
        levents.fireEvent = function(id, action, data) {
            eventCount++;
            var obj = {
                idr:id,
                action:action,
                data:data
            };
            events.push(obj);
        }
        pushManager.init();
        assert.include(pushManager, "datasets");
        assert.deepEqual(pushManager.datasets, {});
    }
}).addBatch({
    "Data sets can be created by pushing arbitrary data in" : {
        topic:function() {
            events = [];
            pushManager.acceptData('testing', dataSets[0], this.callback);
        },
        "which adds that set to the map" : function() {
            assert.equal(pushManager.datasets.testing, true);
        },
        "and also" : {
            "generates events" : function() {
                assert.equal(eventCount, 2);
                assert.equal(events[1].action, 'new');
                assert.equal(events[0].data.id, 500);
                assert.equal(events[1].data.id, 1);
                events = [];
            },
            "and writes out IJOD stuff" : {
                topic: function() {
                    fs.readFile(lconfig.me + "/push/testing.json.gz", this.callback);
                },
                "successfully" : function(err, data) {
                    assert.notEqual(data, undefined);
                }
            }
        }
    },
}).addBatch({
    "Querying the data API returns the data" : {
        topic: function() {
            request.get({uri : "http://localhost:8043/push/testing/getCurrent?stream=true"}, this.callback)
        },
        "from testSync" : function(err, resp, body) {
            var parts = body.split("\n");
            var data = JSON.parse(parts[0]);
            obj = data;
            assert.equal(data.id, 500);
            assert.equal(data.someData, 'BAM');
        }
    }
}).addBatch({
    "Querying for an ID returns the object": {
        topic: function() {
            request.get({uri : "http://localhost:8043/push/testing/500"}, this.callback);
        },
        "successfully" : function(err, resp, body) {
            var data = JSON.parse(body);
            assert.deepEqual(obj, data);
        }
    }
}).addBatch({
    "Pushing to that same API again" : {
        topic: function() {
            events = [];
            pushManager.acceptData('testing', dataSets[1], this.callback);
        },
        "with no data will leave everything intact" : function(err, resp, data) {
            assert.equal(events.length, 0);
            assert.equal(events[0], undefined);
        }
    }
}).addBatch({
    "If the source doesn't return an ID" : {
        topic: function() {
            var self = this;
            events = [];
            pushManager.acceptData('testing', dataSets[2], self.callback)
        },
        "it handles it" : function(err) {
            assert.equal(err, null);
            assert.equal(events.length, 1);
            assert.equal(events[0].action, 'delete');
            assert.equal(events[0].idr, "testing://push/#500");
        }
    }
}).addBatch({
    "Pushing invalid data" : {
        topic: function() {
            pushManager.acceptData('testing', dataSets[3], this.callback);
        },
        "with no value for 'id' errors" : function(err, status, data) {
            assert.equal(err[0].message, 'no value for primary key');
        }
    }
}).addBatch({
    "an endpoint is available" : {
        topic: function() {
            request.get({uri: "http://localhost:8043/push"}, this.callback);
        },
        "to query the map" : function(err, resp, data) {
            assert.deepEqual(JSON.parse(data), {});
        }
    }
}).addBatch({
    "invalid dataset names are" : {
        topic: function() {
            var self = this;
            request.post({uri: "http://localhost:8043/push/^^$"}, this.callback);
        },
        "prohibited" : function(err, resp, data) {
            assert.equal(data, "Invalid dataset name");
        }
    }
}).addBatch({
    "the config file is saved to disk" : {
        topic: function() {
            fs.readFile(path.join(lconfig.me, "push", "push_config.json"), 'ascii', this.callback);
        },
        "properly" : function(err, data) {
            var resp = JSON.parse(data);
            assert.equal(resp.datasets.testing, true);
            assert.deepEqual(resp.testing.ids, [1, 500]);
        }
    },
    teardown : function() {
        levents.fireEvent = realFireEvent;
    }
}).export(module);

