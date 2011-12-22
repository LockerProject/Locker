/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/


/*
* Indexed JSON On Disk
*/

var fs = require('fs');
var path = require('path');
var deepCompare = require('deepCompare');
var sqlite = require('sqlite-fts');
var gzbz2 = require("gzbz2");
var gzip = new gzbz2.Gzip;
var gunzip = new gzbz2.Gunzip;

function IJOD(arg, callback) {
    if(!arg || !arg.name) return callback("invalid args");
    var self = this;
    self.name = arg.name;
    self.gzname = arg.name + '.json.gz';
    self.dbname = arg.name + '.db';
    try{
        if (arg.dir) {
            self.fda = fs.openSync(path.join(arg.dir, self.gzname), 'a');
            self.fdr = fs.openSync(path.join(arg.dir, self.gzname), 'r');
        } else {
            self.fda = fs.openSync(self.gzname, 'a');
            self.fdr = fs.openSync(self.gzname, 'r');
        }
        var stat = fs.fstatSync(self.fdr);
        self.len = stat.size;
    }catch(E){
        return callback(E);
    }
    self.db = new sqlite.Database();
    self.db.open(self.dbname, function (err) {
        if(err) return callback(err);
        self.db.executeScript("CREATE TABLE IF NOT EXISTS ijod (id TEXT PRIMARY KEY, at INTEGER, len INTEGER);",function (err) {
            if(err) return callback(err);
            callback(null, self);
        });
    });
}
exports.IJOD = IJOD;

// takes arg of at least an id and data, callback(err) when done
IJOD.prototype.addData = function(arg, callback) {
    if(!arg || !arg.id) return callback("invalid arg");
    if(!arg.at) arg.at = Date.now();
    gzip.init();
    var gzdata = gzip.deflate(new Buffer(JSON.stringify(arg)+"\n"));
    var gzlast = gzip.end();

    try{
        fs.writeSync(this.fda, gzdata, 0, gzdata.length, null);
        fs.writeSync(this.fda, gzlast, 0, gzlast.length, null);
    }catch(E){
        return callback(E);
    }

    var at = this.len;
    this.len += gzdata.length;
    this.len += gzlast.length;
    this.db.execute("REPLACE INTO ijod VALUES (?, ?, ?)", [arg.id, at, this.len-at], callback);
}

IJOD.prototype.getOne = function(arg, callback) {
    if(!arg || !arg.id) return callback("invalid arg");
    var self = this;
    self.db.query("SELECT at,len FROM ijod WHERE id = ? LIMIT 1", [arg.id], function(err, row){
        if(err) return callback(err);
        if(!row) return callback();
        var buf = new Buffer(row.len);
        fs.readSync(self.fdr, buf, 0, row.len, row.at);
        gunzip.init();
        var x = gunzip.inflate(buf);
        return callback(null, x.toString());
    });
}

IJOD.prototype.getAll = function(arg, callback) {
    if(!arg) return callback("invalid arg");
    var params = [];
    var sql = "SELECT at,len FROM ijod ";
    if(arg.limit)
    {
        sql += " LIMIT ?";
        params.push(parseInt(arg.limit));
    }
    if(arg.offset)
    {
        sql += " OFFSET ?";
        params.push(parseInt(arg.offset));
    }
    var self = this;
    self.db.query(sql, params, function(err, row){
        if(err) return callback(err);
        if(!row) return callback();
        var buf = new Buffer(row.len);
        fs.readSync(self.fdr, buf, 0, row.len, row.at);
        gunzip.init();
        var x = gunzip.inflate(buf);
        return callback(null, x.toString());
    });
}

// takes a new object and checks first if it exists
// callback(err, new|same|update)
IJOD.prototype.smartAdd = function(arg, callback) {
    if(!arg || !arg.id) return callback("invalid arg");
    var self = this;
    self.getOne(arg, function(err, existing){
        if(err) return callback(err);
        // first check if it's new
        if(!existing)
        {
            self.addData(arg, function(err){
                if(err) return callback(err);
                callback(null, "new");
            })
        }
        if (deepCompare(doc, object)) {
            callback(err, 'same', doc);
        } else {
            doc._id = id;
            callback(err, 'update', doc);
        }
    });
}