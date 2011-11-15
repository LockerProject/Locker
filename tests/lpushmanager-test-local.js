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
  , request = require('request')
  , events = {}
  , _id
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


lconfig.load("Config/config.json");

var pushManager = require(__dirname + "/../Common/node/lpushmanager.js");
var lmongo = require(__dirname + '/../Common/node/lmongo');

pushManager.eventEmitter.on('push/testing', function(event) {
    events.push(event);
    eventCount++;
});

vows.describe("Push Manager").addBatch({
    "has a map of the data sets" : function() {
        assert.include(pushManager, "datasets");
        assert.equal(pushManager, []);
    },
}).addBatch({
    "Data sets can be created by pushing arbitrary data in" : {
        topic:function() {
            events = {};
            request.post({uri : "http://localhost:8043/push/testing", json: dataSets[0]}, this.callback);
        },
        "which adds that set to the map" : function(err, status) {
            assert.isNull(err);
            assert.include(pushManager, "datasets");
            assert.include(pushManager.datasets, "testing");
        },
        "and also" : {
            "generates events" : function() {
                assert.equal(eventCount, 2);
                assert.equal(events[1].type, 'new');
                assert.notEqual(events[0].data._id, undefined);
                assert.notEqual(events[1].data._id, undefined)
                assert.equal(events[0].data.id, 500);
                assert.equal(events[1].data.id, 1);
                events = [];
            },
            "and generates mongo data" : {
                topic: function() {
                    var self = this;
                    lmongo.init('push', ['testing'], function(theMongo, theColls) {
                        mongo = theMongo;
                        colls = theColls;
                        colls.testing.count(self.callback);
                    });
                },
                "successfully" : function(err, count) {
                    assert.equal(count, 1);
                }
            },
            "and writes out IJOD stuff" : {
                topic: function() {
                    fs.readFile(lconfig.me + "/push/testing.json", this.callback);
                },
                "successfully" : function(err, data) {
                    assert.equal(data.toString(), '{"timeStamp":1312325283581,"data":{"id":500,"someData":"BAM"}}\n{"timeStamp":1312325283582,"data":{"id":1,"someData":"datas"}}\n');
                }
            }
        }
    },
}).addBatch({
    "Querying the data API returns the data" : {
        topic: function() {
            request.get({uri : "http://localhost:8043/push/testing/getCurrent"}, this.callback)
        },
        "from testSync" : function(err, resp, body) {
            var data = JSON.parse(body);
            _id = data[0]._id;
            obj = data[0];
            assert.equal(data[0].id, 500);
            assert.equal(data[0].someData, 'BAM');
        }
    }
}).addBatch({
    "Querying for an ID returns the object": {
        topic: function() {
            request.get({uri : "http://localhost:8043/push/testing/" + _id}, this.callback);
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
            request.post({uri : "http://localhost:8043/push/testing", json: dataSets[1]}, this.callback);
        },
        "with no data will leave everything intact" : function(err, resp, data) {
            assert.equal(resp.status, 200);
            assert.equal(events.length, 0);
            assert.equal(events[0], undefined);
        }
    }
}).addBatch({
    "If the source doesn't return an ID" : {
        topic: function() {
            var self = this;
            events = [];
            request.post({uri : "http://localhost:8043/push/testing", json: dataSets[2]}, function() {
                 colls.testing.count(self.callback);
            });
        },
        "it will generate a delete event and remove the row from mongo" : function(err, count) {
            assert.equal(count, 1);
            assert.equal(events.length, 1);
            assert.equal(events[0].type, 'delete');
            assert.equal(events[0].data.id, 500);
        }
    }
}).addBatch({
    "Pushing invalid data" : {
        topic: function() {
            request.post({uri : "http://localhost:8043/push/testing", json: dataSets[3]}, this.callback);
        },
        "with no value for 'id' errors" : function(err, status, data) {
            assert.equal(err.message, 'no value for primary key');
        }
    }
}).addBatch({
    "an endpoint is available" : {
        topic: function() {
            request.get({uri : "http://localhost:8043/pushMap"}, this.callback);
        },
        "to query the map" : function(err, status, data) {
            assert.equal(data, ["testing"]);
        }
    }
}).addBatch({
    "can use the query API" : {
        topic: function() {
            request.get({uri : "http://localhost:8043/query/getPush?dataset=testing&limit=1"}, this.callback);
        },
        "to get at the data" : function(err, status, data) {
            assert.equal(data.length, 1);
        }
    }
}).export(module);

