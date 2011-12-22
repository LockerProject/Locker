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
var path = require('path');

var IJOD = require("../Common/node/ijod.js").IJOD;
var lconfig = require('../Common/node/lconfig.js');
lconfig.load("Config/config.json");


var myIJOD;

var suite = vows.describe("IJOD Module");

var events = [{data:{'id':42, 'name':'Thing 1'}, 'id':"10"},
              {data:{'id':4242, 'name':'Thing 2'}, 'id':"100"},
              {data:{'id':424242, 'name':'Sally'}, 'id':"1000"}];

var errs = [];
var item;
var items =0;
suite.addBatch({
    'Can add records to the IJOD': {
        topic: function() {
            var self = this;
            console.error(lconfig.me);
            myIJOD = new IJOD({name:"ijodtest", dir:path.join(lconfig.lockerDir, lconfig.me)}, function(err){
                if(err) errs.push(err);
                myIJOD.addData(events[0], function(err) {
                    if(err) errs.push(err);
                    myIJOD.addData(events[1], function(err) {
                        if(err) errs.push(err);
                        myIJOD.addData(events[2], function(err){
                            if(err) errs.push(err);
                            self.callback()
                        });
                    });
                });
            });
        },
        "successfully" : function() {
            assert.equal(errs.length, 0);
        }
    }
}).addBatch({
    'Can get one record': {
        topic: function() {
            var self = this;
            errs = [];
            myIJOD.getOne({id:"10"}, function(err, i) {
                if(err) errs.push(err);
                item = i;
                self.callback();
            });
        },
        "successfully" : function(item) {
            assert.equal(errs.length, 0);
            assert.include(item, "Thing 1");
        }
    }
}).addBatch({
    'Can get all records': {
        topic: function() {
            var self = this;
            errs = [];
            myIJOD.getAll({limit:3}, function(err, i) {
                if(err) errs.push(err);
                if(!i) return self.callback();
                items++;
            });
        },
        "successfully" : function(item) {
            assert.equal(errs.length, 0);
            assert.equal(items, 3);
        }
    }
});
suite.export(module);
