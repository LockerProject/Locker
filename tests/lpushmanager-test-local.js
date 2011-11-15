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
  , path = require('path')
  , request = require('request')
  , events = []
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

var levents = require("levents");
var realFireEvent = levents.fireEvent;

vows.describe("Push Manager").addBatch({
    "has a map of the data sets" : function() {
        levents.fireEvent = function(type, id, action, obj) {
            eventCount++;
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
                    lmongo.init('push', ['push_testing'], function(theMongo, theColls) {
                        mongo = theMongo;
                        colls = theColls;
                        colls.push_testing.count(self.callback);
                    });
                },
                "successfully" : function(err, count) {
                    assert.equal(count, 2);
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
            pushManager.acceptData('testing', dataSets[2], function() {
                colls.push_testing.count(self.callback);
            });
            //request.post({uri : "http://localhost:8043/push/testing", json: dataSets[2]}, function() {
                 //colls.push_testing.count(self.callback);
            //});
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

