/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var assert = require("assert");
var fs = require('fs');
var path = require('path');
var lconfig = require('lconfig');
var is = require("lutil").is;
var util = require('util');
var currentEngine;
var indexPath = '../../Me/search.indices';

CLEngine = function()
{
    this.engine = require('clucene');
    this.cl = this.engine.CLucene;
    this.lucene = new this.cl.Lucene();
    this.mappings = {
        "contact" : {
            "_id":"_id",
            "name":"name",
            "nicknames":[],
            "email":[
                {
                    "value":"value"
                }
            ],
            "im":[
                {
                    "value":"value"
                }
            ],
            "address":[
                {
                    "value":"value"
                }
            ]
        }
    };

    path.exists(indexPath, function(exists) {
        if (!exists) {
            fs.mkdirSync(indexPath, 0755);
        }
    });
    
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

/*
CLEngine.prototype.map = function(type, value) {
    contentTokens = [];

    if (type === 'contact') {
        var i=0;
        var l=0;
        contentTokens.push(value.name);

        if (value.hasOwnProperty('nicknames')) {
            for (i=0, l=value.nicknames.length; i<l; i++) {
                if (is("String", value.nicknames[i])) {
                    contentTokens.push(value.nicknames[i]);
                }
            }
        }

        if (value.hasOwnProperty('addresses')) {
            for (i=0, l=value.addresses.length; i<l; i++) {
                if (is("String", value.addresses[i].value)) {
                    contentTokens.push(value.addresses[i].value);
                }
            }
        }
    }
    
    return contentTokens;
};
*/
CLEngine.prototype.indexType = function(type, value, callback) {
    var doc = new this.cl.Document();
    //console.error(util.inspect(value, true, 10));
    // Use the mapping to generate the content field
    //
    //var contentTokens = CLEngine.prototype.map(type, value);
    //console.log('Tokens: ' + contentTokens);
    
    if (!this.mappings.hasOwnProperty(type)) {
        callback("No valid mapping for the type: " + type);
    }
    
    var contentTokens = [];
    processValue = function(v, parentMapping) {
        if (is("Array", v)) {
            for(var i = 0, l = v.length; i < l; i++) {
                var nextValue = v[i];
                if (is("Object", nextValue) || is("Array", nextValue)) {
                    // XXX:  This only supports a single type in the array right now
                    processValue(v[i], parentMapping[0]);
                } else {
                    processValue(v[i], undefined);
                }
            }
        } else if (is("Object", v)) {
            for (var k in parentMapping) {
                if (k === "_id") continue;
                subMapping = parentMapping[k];
                valueKey = subMapping;
                if (is("Array", subMapping) || is("Object", subMapping)) valueKey = k;
                if (!v.hasOwnProperty(valueKey)) continue;
                processValue(v[valueKey], subMapping);
            }
        } else {
            if (v) contentTokens.push(v.toString());
        }

    };
    processValue(value, this.mappings[type]);
    
    var contentString = contentTokens.join(" <> ");
    console.log("Going to store " + contentString);
    doc.addField('_id', value[this.mappings[type]["_id"]].toString(), this.engine.Store.STORE_YES|this.engine.Index.INDEX_UNTOKENIZED);
    doc.addField("_type", type, this.engine.Store.STORE_YES|this.engine.Index.INDEX_UNTOKENIZED);
    doc.addField('content', contentString, this.engine.Store.STORE_YES|this.engine.Index.INDEX_TOKENIZED);
    console.log('about to index at ' + indexPath);
    this.lucene.addDocument(doc, indexPath, function(err, indexTime) {
        callback(err, indexTime);
    });
};
CLEngine.prototype.queryType = function(type, query, params, callback) {
    this.lucene.search(indexPath, "content:(" + query + ") AND +_type:" + type, callback);
};
CLEngine.prototype.queryAll = function(query, params, callback) {
    this.lucene.search(indexPath, "content:(" + query + ")", callback);
};


exports.setEngine = function(engine) {
    if (currentEngine) currentEngine = undefined;
    currentEngine = new engine();
};
exports.setIndexPath = function(path) {
    indexPath = path;
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

function indexMore(keepGoing) {
    // I still feel like async can break this unless there's some sort of atomic guarantee
    if (indexing && !keepGoing) return;
    indexing = true;
    console.log('IndexQueue length: ' + indexQueue.length);
    if (indexQueue.length === 0) {
        indexing = false;
        return;
    }
    
    var cur = indexQueue.shift();
    assert.ok(currentEngine);
    currentEngine.indexType(cur.type, cur.value, function(err, indexTime) {
        console.log('Indexed ' + cur.type + ' id: ' + cur.value._id + ' in ' + indexTime + ' ms');
        cur.cb(err, indexTime);
        console.log("Setting up for next tick");
        process.nextTick(function() { indexMore(true); });
    });
}

exports.engines = {
    "CLucene" : CLEngine,
    "ElasticSearch" : undefined // ESEngine
};

