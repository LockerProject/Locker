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
var fs = require('fs');

var IJOD = require("../Common/node/ijod.js").IJOD;
var lfs = require("../Common/node/lfs.js");
var lconfig = require('../Common/node/lconfig.js');

var myIJOD;

var suite = vows.describe("IJOD Module");

var events = [{data:{'id':42, 'name':'Thing 1'}, 'timeStamp':10},
              {data:{'id':4242, 'name':'Thing 2'}, 'timeStamp':100},
              {data:{'id':424242, 'name':'Sally'}, 'timeStamp':1000}];

var errs = [];
suite.addBatch({
    'Can add records to the IJOD': {
        topic: function() {
            myIJOD = new IJOD(lconfig.me + '/ijodtest');
            var self = this;
            myIJOD.addRecord(events[0].timeStamp, events[0].data, function(err) {
                if(err) errs.push(err);
                myIJOD.addRecord(events[1].timeStamp, events[1].data, function(err) {
                    if(err) errs.push(err);
                    myIJOD.addRecord(events[2].timeStamp, events[2].data, self.callback);
                });
            });
        },
        "successfully" : function() {
            assert.equal(errs.length, 0);
        }
    }
});
suite.export(module);
