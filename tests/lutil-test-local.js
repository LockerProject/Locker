/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var assert = require("assert");
var vows = require("vows");
var testUtils = require(__dirname + "/test-utils.js");
var fs = require('fs');
var lutil = require('lutil');


var filename = 'tmp_' + Math.random() + '.json';
var obj1 = {hello:'world!'};
var obj2 = {hello:'world!!!'};

vows.describe("Locker Utils").addBatch({
    "Writing to an new file atomically": {
        topic:function() {
            lutil.atomicWriteFileSync(filename, JSON.stringify(obj1));
            return true;
        },
        "works": function() {
            assert.equal(JSON.parse(fs.readFileSync(filename)).hello, obj1.hello);
        }
    }
}).addBatch({
    "Writing over a file atomically": {
        topic:function() {
            lutil.atomicWriteFileSync(filename, JSON.stringify(obj2));
            return true;
        },
        "works": function() {
            assert.equal(JSON.parse(fs.readFileSync(filename)).hello, obj2.hello);
        },
        "and leaves the original file behind": function() {
            assert.equal(JSON.parse(fs.readFileSync(filename + '.bkp')).hello, obj1.hello);
        }
    }
}).addBatch({
    "Can clean up after itself": {
        topic:function() {
            fs.unlinkSync(filename);
            fs.unlinkSync(filename + '.bkp');
            return true;
        },
        "properly" :function() {
        }
    }
}).export(module);
