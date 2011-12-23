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
        self.fda = fs.openSync(self.gzname, 'a');
        self.fdr = fs.openSync(self.gzname, 'r');
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
    arg.id = arg.id.toString(); // safety w/ numbers
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

// adds a deleted record to the ijod and removes from index
IJOD.prototype.delData = function(arg, callback) {
    if(!arg || !arg.id) return callback("invalid arg");
    arg.id = arg.id.toString(); // safety w/ numbers
    if(!arg.at) arg.at = Date.now();
    arg.type = "delete";
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
    this.db.execute("DELETE FROM ijod WHERE id = ?", [arg.id], callback);
}

// this only calls callback(err, rawstring) once!
IJOD.prototype.getOne = function(arg, callback) {
    if(!arg || !arg.id) return callback("invalid arg");
    arg.id = arg.id.toString(); // safety w/ numbers
    var self = this;
    var did = false;
    self.db.query("SELECT at,len FROM ijod WHERE id = ? LIMIT 1", [arg.id], function(err, row){
        if(did) return; // only call callback ones
        did = true;
        if(err) return callback(err);
        if(!row) return callback();
        var buf = new Buffer(row.len);
        fs.readSync(self.fdr, buf, 0, row.len, row.at);
        gunzip.init();
        var x = gunzip.inflate(buf);
        return callback(null, arg.raw ? x : stripper(x));
    });
}

// will call callback(err, rawstring) continuously until rawstring==undefined
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
        return callback(null, arg.raw ? x : stripper(x));
    });
}

// takes a new object and checks first if it exists
// callback(err, new|same|update)
IJOD.prototype.smartAdd = function(arg, callback) {
    if(!arg || !arg.id) return callback("invalid arg");
    arg.id = arg.id.toString(); // safety w/ numbers
    var self = this;
    self.getOne(arg, function(err, existing){
        if(err) return callback(err);
        // first check if it's new
        if(!existing)
        {
            self.addData(arg, function(err){
                if(err) return callback(err);
                callback(null, "new");
            });
            return;
        }
        try { var obj = JSON.parse(existing); } catch(E){ return callback(E); }
        delete obj.at; // make sure not to compare any timestamps
        delete arg.at;
        // they're identical, do nothing
        if (deepCompare(arg, obj)) return callback(null, 'same');
        // it's different, save an update
        self.addData(arg, function(err){
            if(err) return callback(err);
            callback(null, "update");
        })
    });
}

// utilities to respond to a web request, shared between synclets and push
IJOD.prototype.reqCurrent = function(req, res)
{
    var streaming = (req.query['stream'] == "true");
    var options = {};
    if(req.query['limit']) options.limit = parseInt(req.query['limit']);
    if(req.query['offset']) options.offset = parseInt(req.query['offset']);

    var ctype = streaming ? "application/jsonstream" : "application/json";
    res.writeHead(200, {'content-type' : ctype});
    var first = true;
    this.getAll(options, function(err, item){
        if(err) logger.error(err);
        if(item == null)
        { // all done
            if(!streaming) res.write("]");
            return res.end()
        }
        if(streaming) return res.write(item+'\n');
        if(first)
        {
            first = false;
            return res.write('['+item);
        }
        res.write(','+item);
    });

}
IJOD.prototype.reqID = function(req, res)
{
    this.getOne({id:req.params.id}, function(err, item) {
        if (err) logger.error(err);
        if (!item) return res.send("not found",404);
        res.writeHead(200, {'content-type' : 'application/json'});
        res.end(item);
    });
}

// make a string and return only the interior data object!
function stripper(buf)
{
    var s = buf.toString();
    return s.slice(s.indexOf('{',1),s.lastIndexOf('}',s.length-3)+1); // -3 accounts for }\n
}