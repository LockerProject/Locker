/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

require.paths.push(__dirname + "/../Common/node");
var assert = require('assert');
var vows = require('vows');
var events = require('events');
var RESTeasy = require('api-easy');
var suite = RESTeasy.describe('Locker Search');
var lconfig = require('lconfig');
var lsearch = require('lsearch');
lconfig.load('Config/config.json');

lsearch.setEngine(lsearch.engines.CLucene);
lsearch.setIndexPath(__dirname + "/" + lconfig.me + "/search.index");

suite.next().suite.addBatch({
    "Can pick the CLucene engine":{
        topic:function() {
            try {
                var search = lsearch.setEngine(lsearch.engines.CLucene);
                return true;
            } catch(E) {
                return false;
            }
        },
        "successfully":function(err) {
            assert.isTrue(err);
        }
    }
}).addBatch({
    "Can index a document":{
        topic:function() {
            lsearch.currentEngine.mappings["test"] = {"_id":"randomId", "test":"test"};
            lsearch.indexType("test", {"randomId":1, "test":"testing the indexing of a document"}, this.callback);
        },
        "successfully":function(err, indexTime) {
            assert.isNull(err);
            assert.greater(indexTime, -1, "Indexing error");
        }
    }
}).addBatch({
    "Can search for a document by type":{
        topic:function() {
            lsearch.queryType("test", "testing", {}, this.callback);
        },
        "successfully":function(err, results) {
            assert.isNull(err);
            assert.greater(results, 0, "No results were foind");
        }
    },
    "Can search for a document in all types":{
        topic:function() {
            lsearch.queryAll("testing", {}, this.callback);
        },
        "successfully":function(err, results) {
            assert.isNull(err);
            assert.greater(results, 0, "No results were foind");
        }
    }
});

if (lsearch.currentEngine.name() !== 'Null engine') {
    suite.export(module);
}


