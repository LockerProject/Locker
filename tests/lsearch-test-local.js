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
            assert.greater(results, 0, "No results were found");
        }
    },
    "Can search for a document in all types":{
        topic:function() {
            lsearch.queryAll("testing", {}, this.callback);
        },
        "successfully":function(err, results) {
            assert.isNull(err);
            assert.greater(results, 0, "No results were found");
        }
    }
}).addBatch({
    "Can add doc 1 of a type":{
        topic:function() {
            lsearch.indexType("test", {"randomId":1, "test":"testing the indexing of a document1"}, this.callback);         
        },
        "successfully":function(err, indexTime) {
            assert.isNull(err);
            assert.greater(indexTime, -1, "Indexing error");
        }
    },
    "Can add doc 2 of a type":{
        topic:function() {
            lsearch.indexType("test", {"randomId":2, "test":"testing the indexing of a document2"}, this.callback);         
        },
        "successfully":function(err, indexTime) {
            assert.isNull(err);
            assert.greater(indexTime, -1, "Indexing error");
        }
    },
    "Can add doc 3 of a type":{
        topic:function() {
            lsearch.indexType("test", {"randomId":3, "test":"testing the indexing of a document3"}, this.callback);         
        },
        "successfully":function(err, indexTime) {
            assert.isNull(err);
            assert.greater(indexTime, -1, "Indexing error");
        }
    }
}).addBatch({
    "3 documents of that type exist in the index after inserting":{
        topic:function() {
            lsearch.queryType("test", "test*", {}, this.callback);
        },
        "successfully":function(err, results) {
            assert.isNull(err);
            assert.equal(results.length, 3, "Results that were indexed were not found");
        }
    }
}).addBatch({
    "Can delete all documents of type":{
        topic:function() {
            lsearch.deleteDocumentsByType("test", this.callback);
        },
        "successfully":function(err, indexTime) {
            assert.isNull(err);
            assert.greater(indexTime, -1, "Indexing error");
        }
    }
}).addBatch({
    "No documents of that type exist in the index anymore":{
        topic:function() {
            lsearch.queryType("test", "test*", {}, this.callback);
        },
        "successfully":function(err, results) {
            assert.isNull(err);
            assert.equal(results, 0, "Results were not deleted");
        }
    }
});

if (lsearch.currentEngine.name() !== 'Null engine') {
    suite.export(module);
}


