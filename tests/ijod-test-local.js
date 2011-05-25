/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var vows = require("vows");
var assert = require("assert");

var IJOD = require("../Common/node/ijod.js").IJOD;

var myIJOD = new IJOD('ijodtest');

var suite = vows.describe("IJOD Module");

suite.addBatch({
    'An IJOD': {
        topic: myIJOD,
        'can be created': function (ijod) {
            assert.isNotNull(ijod);
        },
        'can be initialized asynchronously': {
            topic: function(ijod) {
                ijod.init(this.callback);
            },
            'no errors are thrown': function(err) {
                assert.ok(!err);
            }
        }
   }
})

var events = [{data:{'id':42, 'name':'Thing 1'}, 'timeStamp':10},
              {data:{'id':4242, 'name':'Thing 2'}, 'timeStamp':100},
              {data:{'id':424242, 'name':'Sally'}, 'timeStamp':1000}];

var errs = [];
suite.addBatch({
    'Can add records to the IJOD': {
        topic: function() {
            var self = this;
            myIJOD.addRecord(events[0].data.id, events[0].timeStamp, events[0].data, function(err) {
                if(err) errs.push(err);
                myIJOD.addRecord(events[1].data.id, events[1].timeStamp, events[1].data, function(err) {
                    if(err) errs.push(err);
                    myIJOD.addRecord(events[2].data.id, events[2].timeStamp, events[2].data, self.callback);
                });
            });
        },
        "successfully" : function() {
            assert.equal(errs.length, 0);
        }
    }
});

suite.addBatch({
    'Can get records after a time stamp': {
        topic: function() {
            myIJOD.getAfterTimeStamp(10, this.callback);
        },
        'gets the correct records': function(err, retrievedRecords) {
            assert.ok(!err);
            assert.equal(JSON.stringify(retrievedRecords[0]), JSON.stringify(events[1].data));
            assert.equal(JSON.stringify(retrievedRecords[1]), JSON.stringify(events[2].data));
        }
    }
});

suite.export(module);
