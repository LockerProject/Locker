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

suite.addBatch({
    'Can add records to the IJOD': function() {
        events.forEach(function(evt) {
            myIJOD.addRecord(evt.data.id, evt.timeStamp, evt.data);
        });
    }
});
// 
// suite.addBatch({
//     'Can get a record': {
//         topic: function() {
//             myIJOD.getRecordByID(1, this.callback);
//         },
//         'gets the correct record': function(err, record) {
//             assert.ok(!err);
//             assert.equal(JSON.stringify(records[1]), JSON.stringify(record));
//         }
//     }
// });
// 
// suite.addBatch({
//     'Can get records after an ID': {
//         topic: function() {
//             myIJOD.getAfterRecordID(0, this.callback);
//         },
//         'gets the correct records': function(err, retrievedRecords) {
//             assert.ok(!err);
//             assert.equal(JSON.stringify(records[1]), JSON.stringify(retrievedRecords[0]));
//             assert.equal(JSON.stringify(records[2]), JSON.stringify(retrievedRecords[1]));
//         }
//     }
// });
// 
// suite.addBatch({
//     'Can get records after a time stamp': {
//         topic: function() {
//             myIJOD.getAfterFieldsValueEquals('timeStamp', 10, this.callback);
//         },
//         'gets the correct records': function(err, retrievedRecords) {
//             assert.ok(!err);
//             assert.equal(JSON.stringify(records[1]), JSON.stringify(retrievedRecords[0]));
//             assert.equal(JSON.stringify(records[2]), JSON.stringify(retrievedRecords[1]));
//         }
//     }
// });

suite.export(module);
