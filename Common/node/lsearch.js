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
var logger = require("logger");
var util = require('util');
var url = require('url');
var indexPath;

exports.currentEngine;

function noop() {
}

NullEngine = function()
{
}
NullEngine.prototype.indexType = function(type, id, obj, cb) {
    cb("Null engine");
};
NullEngine.prototype.queryAll = function(q, params, cb) {
    cb("Null engine");
};
NullEngine.prototype.queryType = function(type, q, params, cb) {
    cb("Null engine");
};
NullEngine.prototype.name = function() {
    return "Null engine";
};
NullEngine.prototype.flushAndCloseWriter = function() {
};

SLEngine = function()
{
    this.sqlite = require('sqlite-fts');
    this.db = new this.sqlite.Database();
    this.mappings = {
        "contactcontacts" : {
            "name":"name",
            "nicknames":[],
            "accounts":{
                "twitter":[
                    {
                        "data":{
                            "description":"description"
                        }
                    }
                ]
            },
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
        },
        "photophotos" : {
            "caption":"caption",
            "title":"title"
        },
        "tweettwitter" : {
            "text":"text",
            "user":{
                "name":"name",
                "screen_name":"screen_name"
            }
        },
        "timelinetwitter" : {
            "text":"text",
            "user":{
                "name":"name",
                "screen_name":"screen_name"
            }
        },
        "postfacebook" : {
            "description":"description",
            "message":"message",
            "from":{
                "name":"name"
            }
        },
        "placeplaces" : {
            "title":"title"
        },
    };

    return this;
};

SLEngine.prototype.init = function(callback){
    assert.ok(indexPath);
    var self = this;
    this.db.open(indexPath, function (error) {
        if (error) {
            logger.error("failed to open "+indexPath+": "+error);
            callback();
        }else{
            self.db.executeScript("CREATE VIRTUAL TABLE ndx USING fts4(id, type, content);", function (error) {
                if (error) logger.error("failed to create table: "+error);
                callback();
            });
        }
    });
}

SLEngine.prototype.indexType = function(type, id, value, callback) {
    if (!id) {
        callback("No valid id property was found");
        return;
    }

    if (!this.mappings.hasOwnProperty(type)) {
        callback("No valid mapping for the type: " + type);
        return;
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

    if (contentTokens.length === 0) {
        logger.verbose("No valid tokens were found to index id " + id);
        return callback(null, 0, 0);
    }

    var contentString = contentTokens.join(" <> ");
    var at = Date.now();
    this.db.execute("INSERT INTO ndx VALUES (?, ?, ?)", [id, type, contentString], function(err, rows){
        callback(err, Date.now() - at);
    });
};
SLEngine.prototype.deleteDocument = function(id, callback) {
    this.db.execute("DELETE FROM ndx WHERE id = ?", [id], callback);
};
SLEngine.prototype.deleteDocumentsByType = function(type, callback) {
    this.db.execute("DELETE FROM ndx WHERE type MATCH ?", [type], callback);
};
SLEngine.prototype.queryType = function(type, query, params, callback) {
    var rows = [];
    var at = Date.now();
    this.db.query("SELECT id, type FROM ndx WHERE ndx MATCH ?", ["type:"+type+" "+query], function(err, row){
        if(err) logger.error("query failed: "+err);
        if(!row) return callback(err, rows, Date.now() - at);
        rows.push(row);
    })
};
SLEngine.prototype.queryAll = function(query, params, callback) {
    var rows = [];
    var at = Date.now();
    this.db.query("SELECT id, type FROM ndx WHERE ndx MATCH ?", [query], function(err, row){
        if(err) logger.error("query failed: "+err);
        if(!row) return callback(err, rows, Date.now() - at);
        rows.push(row);
    })
};
SLEngine.prototype.name = function() {
    return "SLEngine";
};
SLEngine.prototype.flushAndCloseWriter = function() {
};


exports.setEngine = function(engine) {
    if (engine === undefined) {
        logger.error("Falling back to search Null Engine, your indexing and queries will not work.");
        exports.currentEngine = new NullEngine();
        return;
    }
    if (exports.currentEngine) exports.currentEngine = undefined;
    try {
        exports.currentEngine = new engine();
    } catch (E) {
        logger.error("Falling back to search Null Engine, your indexing and queries will not work. (" + E + ")");
        exports.currentEngine = new NullEngine();
    }
};

exports.setIndexPath = function(newPath, callback) {
    indexPath = newPath;
    if(!exports.currentEngine.init) return callback();
    exports.currentEngine.init(callback);
};

function exportEngineFunction(funcName) {
    var funcToRun = function() {
        assert.ok(exports.currentEngine);
        exports.currentEngine[funcName].apply(exports.currentEngine, arguments);
    };
    exports[funcName] = funcToRun;
}
exportEngineFunction("queryType");
exportEngineFunction("queryAll");
exportEngineFunction("flushAndCloseWriter");

// Indexing Parts Be Here
var indexQueue = [];
var indexing = false;

exports.indexType = function(type, id, value, cb) {
    indexQueue.push({"type":type, "id":id, "value":value, "cb":cb});
    process.nextTick(indexMore);
};

exports.deleteDocument = function(id, cb) {
  exports.currentEngine.deleteDocument(id, cb);
};

exports.deleteDocumentsByType = function(type, cb) {
  exports.currentEngine.deleteDocumentsByType(type, cb);
}

// CAREFUL!  Make sure all your readers/writers are closed before calling this
exports.resetIndex = function(callback) {
    assert.ok(indexPath);
    try {
        fs.unlinkSync(indexPath);
        callback(null)
    } catch (E) {
        if (E.code == "ENOENT") return callback(null);
        callback(E);
    }
};

function indexMore(keepGoing) {
    // I still feel like async can break this unless there's some sort of atomic guarantee
    if (indexing && !keepGoing) return;
    indexing = true;
    //logger.debug('IndexQueue length: ' + indexQueue.length);
    if (indexQueue.length === 0) {
        indexing = false;
        return;
    }
    var cur = indexQueue.shift();
    assert.ok(exports.currentEngine);
    exports.currentEngine.indexType(cur.type, cur.id, cur.value, function(err, indexTime) {
        cur.cb(err, indexTime);
        delete cur;
        cur = null;
        //logger.debug("Setting up for next tick");
        // TODO: review for optimization per ctide comment (per 100 instead of per 1?)
        process.nextTick(function() { indexMore(true); });
    });
}

exports.engines = {
    "SQLite" : SLEngine,
    "CLucene" : undefined, // CLEngine, depreciated due to clucene project stagnation :(
    "ElasticSearch" : undefined // ESEngine
};

