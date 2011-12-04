/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs');
var is = require("lutil").is;
var url = require('url');
var sqlite = require('sqlite-fts');
var db = new sqlite.Database();
var indexPath;
var mappings = {
    "contact:" : {
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
    "photo:" : {
        "caption":"caption",
        "title":"title"
    },
    "place:" : {
        "title":"title"
    },
    "link:" : {
        "title":"title",
        "link":"link",
        "text":"text",
        "embed":{
            "title":"title"
        }
    },
}


exports.init = function(dbfile, callback)
{
    indexPath = dbfile;
    db.open(indexPath, function (error) {
        if (error) return callback("failed to open "+indexPath+": "+error);
        db.executeScript("CREATE VIRTUAL TABLE ndx USING fts4(idr TEXT PRIMARY KEY, at INT, title TEXT, content TEXT);", function (error) {
            if (error) return callback("failed to create table: "+error);
            callback();
        });
    });
}

exports.index = function(idr, data, update, callback) {
    if (!idr) return callback("Missing idr");
    if (!data) return callback("Missing data");

    var contentTokens = [];
    var r = url.parse(idr);
    if(!mappings[r.protocol]) return callback("unknown type: "+r.protocol);
    var at = data.at || data.timestamp || Date.now();
    var title = data.title || "";

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
    processValue(data, mappings[r.protocol]);

    if (contentTokens.length === 0) return callback();

    var contentString = contentTokens.join(" <> ");
    var sql = "INSERT INTO ndx VALUES (?, ?, ?, ?)";
    if(update) sql = "UPDATE ndx SET idr = ?, at = ?, title = ?, content = ? WHERE idr MATCH ?";
    db.execute(sql, [idr, at, title, contentString, idr], function(err, rows){
        callback(err);
    });
};

exports.delete = function(idr, callback) {
    db.execute("DELETE FROM ndx WHERE idr = ?", [idr], callback);
};

exports.deleteType = function(type, callback) {
    db.execute("DELETE FROM ndx WHERE idr MATCH ?", [type], callback);
};

exports.query = function(arg, cbEach, cbDone) {
    if(!arg.q) return cbDone("no query");
    if(!arg.limit) arg.limit = 100;
    if(!arg.offset) arg.offset = 0;
    var sql = "SELECT idr,at";
    sql += arg.snippet ? ", snippet(ndx)" : "";
    sql += " FROM ndx WHERE ndx MATCH ?";
    sql += arg.sort ? " ORDER BY at DESC" : "";
    sql += " LIMIT ? OFFSET ?";
    // sort, limit, offset
    db.query(sql, [arg.q, arg.limit, arg.offset], function(err, row){
        if(!row) return cbDone(err);
        cbEach(row);
    })
};

exports.reset = function(callback) {
    try {
        fs.unlinkSync(indexPath);
        exports.init(indexPath,callback);
    } catch (E) {
        if (E.code == "ENOENT") return callback(null);
        callback(E);
    }
};

