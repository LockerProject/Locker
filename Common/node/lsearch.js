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

var currentEngine = undefined;

exports.engines = {
    "CLucene" : CLEngine,
    "ElasticSearch" : ESEngine
};

CLEngine = function()
{
    this.cl = require('clucene').CLucene;
    this.lucene = new cl.Lucene();
    this.mappings = {
        "contact" : [
            "name", "nickname", "email", "im", "address"
        ]
    };
    
    return this;
}
CLEngine.prototype.indexType = function(type, value, callback) {
    var doc = new cl.Document();
    
    // Use the mapping to generate the content field
    //
    if (!this.mappings.hasOwnProperty(type)) {
        callback("No valid mapping for the type: " + type);
    }
    var contentTokens = [];
    for (k in value) {
        if (!value.hasOwnProperty(k)) continue;
        if (mappings.indexOf(k) < 0) continue;
        if (is("Array", value[k])) {
            for(var i = 0, l = value[k].length; i < l; i++) {
                contentTokens.push(value[k][i].toString());
            }
        } else if (is("Object", value[k])) {
            for(i in value[k]) {
                contentTokens.push(value[k][i].toString());
            }
        } else {
            contentTokens.push(value[k].toString());
        }
    }
    
    doc.addField('_id', value.id, this.cl.Store.STORE_YES|this.cl.Index.INDEX_UNTOKENIZED);
    doc.addField("_type", type, this.cl.Store.STORE_YES|this.cl.Index.INDEX_UNTOKENIZED);
    doc.addField('content', value, this.cl.Store.STORE_NO|this.cl.Index.INDEX_TOKENIZED);
    lucene.addDocument(doc, process.cwd() + '/' + lconfig.me + '/search.index', function(err, indexTime) {
        callback(err, indexTime);
    });
}
CLEngine.prototype.queryType = function(type, query, params, callback) {
    
    lucene.search("tweets.lucene", "content:(" + process.argv[2] + ")", function(err, results) {
        if (err) {
            console.log("Search error: " + err);
            return;
        }
        var objects = fs.readFileSync("user_timeline.json", "utf8").split("\n");
        objects = objects.map(function(objText) { 
            try {
                var json = JSON.parse(objText);
                return json;
            } catch(E) {
                return undefined;
            }
        }).filter(function(obj) { return obj !== undefined; });
        results.forEach(function(result) {
            var id = parseInt(result.id);
            objects.some(function(obj) {
                if (obj.data.id == id) {
                    console.log("score(" + result.score + ") " + obj.data.created_at + " - " + obj.data.text);
                    return true;
                } else {
                    return false;
                }

            });
        });
    });

}
CLEngine.prototype.queryAll = function(type, query, params, callback) {
}


exports.setEngine = function(engine) {
    if (currentEngine) delete currentEngine;
    assert(exports.engines.hasOwnProperty(engine));
    currentEngine = new exports.engines[engine]();
};

function exportEngineFunction(funcName) {
    var funcToRun = function() {}
        assert.ok(currentEngine);
        currentEngine[func].apply(currentEngine, arguments);
    }
    exports[funcName] = funcToRun;
}
exportEngineFunction("indexType");
exportEngineFunction("queryType");
exportEngineFunction("queryAll");
