/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var assert = require("assert");
var lconfig = require('lconfig');
var is = require("lutil").is;
var util = require('util');

var currentEngine;

CLEngine = function()
{
    this.engine = require('clucene');
    this.cl = this.engine.CLucene;
    this.lucene = new this.cl.Lucene();
    this.mappings = {
        "contact" : [
            "name", "nickname", "email", "im", "address"
        ]
    };
    
    this.engine.Store = {
      STORE_YES: 1,
      STORE_NO: 2,
      STORE_COMPRESS: 4
    };

    this.engine.Index = {
      INDEX_NO: 16,
      INDEX_TOKENIZED: 32,
      INDEX_UNTOKENIZED: 64,
      INDEX_NONORMS: 128,
    };

    this.engine.TermVector = {
      TERMVECTOR_NO: 256,
      TERMVECTOR_YES: 512,
      TERMVECTOR_WITH_POSITIONS: 512 | 1024,
      TERMVECTOR_WITH_OFFSETS: 512 | 2048,
      TERMVECTOR_WITH_POSITIONS_OFFSETS: (512 | 1024) | (512 | 2048) 
    };
    
    return this;
};

CLEngine.prototype.indexType = function(type, value, callback) {
    var doc = new this.cl.Document();
    
    // Use the mapping to generate the content field
    //
    if (!this.mappings.hasOwnProperty(type)) {
        callback("No valid mapping for the type: " + type);
    }
    var contentTokens = [];
    for (var k in value) {
        if (!value.hasOwnProperty(k)) continue;
        if (this.mappings[type].indexOf(k) < 0) continue;
        processValue = function(v) {
            if (is("Array", v)) {
                for(var i = 0, l = v.length; i < l; i++) {
                    processValue(v[i]);
                    //contentTokens.push(value[k][i].toString());
                }
            } else if (is("Object", v)) {
                for(var j in value[k]) {
                    processValue(v[j]);
                    //contentTokens.push(value[k][i].toString());
                }
            } else {
                if (v) contentTokens.push(v.toString());
            }

        };
        processValue(value[k]);
    }
    var contentString = contentTokens.join(" <> ");
    console.log("Going to store " + contentString);
    doc.addField('_id', value._id.toString(), this.engine.Store.STORE_YES|this.engine.Index.INDEX_UNTOKENIZED);
    doc.addField("_type", type, this.engine.Store.STORE_YES|this.engine.Index.INDEX_UNTOKENIZED);
    doc.addField('content', contentString, this.engine.Store.STORE_YES|this.engine.Index.INDEX_TOKENIZED);
    this.lucene.addDocument(doc, process.cwd() + '/' + lconfig.me + '/search.index', function(err, indexTime) {
        callback(err, indexTime);
    });
};
CLEngine.prototype.queryType = function(type, query, params, callback) {
    var indexLocation = process.cwd() + '/' + lconfig.me + '/search.index';
    this.lucene.search(indexLocation, "content:(" + query + ") AND +_type:" + type, callback);
};
CLEngine.prototype.queryAll = function(query, params, callback) {
    var indexLocation = process.cwd() + '/' + lconfig.me + '/search.index';
    this.lucene.search(indexLocation, "content:(" + query + ")", callback);
};


exports.setEngine = function(engine) {
    if (currentEngine) currentEngine = undefined;
    currentEngine = new engine();
};

function exportEngineFunction(funcName) {
    var funcToRun = function() {
        assert.ok(currentEngine);
        currentEngine[funcName].apply(currentEngine, arguments);
    };
    exports[funcName] = funcToRun;
}
exportEngineFunction("queryType");
exportEngineFunction("queryAll");

// Indexing Parts Be Here
var indexQueue = [];
var indexing = false;

exports.indexType = function(type, value, cb) {
    indexQueue.push({"type":type, "value":value, "cb":cb});
    process.nextTick(indexMore);
};

function indexMore() {
    // I still feel like async can break this unless there's some sort of atomic guarantee
    if (indexing) return;
    indexing = true;
    
    if (indexQueue.length === 0) {
        indexing = false;
        return;
    }
    
    var cur = indexQueue.shift();
    assert.ok(currentEngine);
    currentEngine.indexType(cur.type, cur.value, function(err, indexTime) {
        cur.cb(err, indexTime);
        process.nextTick(indexMore);
    });
}

exports.engines = {
    "CLucene" : CLEngine,
    "ElasticSearch" : undefined // ESEngine
};

