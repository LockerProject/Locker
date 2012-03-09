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
var deepCompare = require('./deepCompare');
var sqlite = require('sqlite-fts');
var zlib = require("compress-buffer");
var lutil = require("lutil");

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

IJOD.prototype.startAddTransaction = function() {
  this.transactionItems = [];
};

IJOD.prototype.commitAddTransaction = function(cbDone) {
  if (!this.transactionItems || this.transactionItems.length == 0) return cbDone();
  console.log("Commiting %d items", this.transactionItems.length);
  var totalSize = this.transactionItems.reduce(function(prev, cur, idx, arr) { return prev + arr[idx].length; }, 0);
  var writeBuffer = new Buffer(totalSize);
  var idx = 0;
  var self = this;
  lutil.forEachSeries(self.transactionItems, function(item, cb) {
    item.copy(writeBuffer, idx);
    idx += item.length;
    cb();
  }, function(err) {
    fs.write(self.fda, writeBuffer, 0, writeBuffer.length, null, function(err, written, buffer) {
      // We end the transaction
      writeBuffer = null;
      self.transactionItems = null;
      if (err) {
        console.error("Error writing to IJOD: %e", err);
      } else if (written != totalSize) {
        console.error("Only %d written of %d bytes to IJOD", written, totalSize);
      }
      return cbDone();
    });
  });
}

IJOD.prototype.updateIndex = function(id, gzlen, cbDone) {
  var at = this.len;
  this.len += gzlen;
  this.db.execute("REPLACE INTO ijod VALUES (?, ?, ?)", [id, at, this.len-at], cbDone);
};

// takes arg of at least an id and data, callback(err) when done
IJOD.prototype.addData = function(arg, callback) {
  if(!arg || !arg.id) return callback("invalid arg");
  arg.id = arg.id.toString(); // safety w/ numbers
  if(!arg.at) arg.at = Date.now();
  var self = this;
  var gzdata = zlib.compress(new Buffer(JSON.stringify(arg)+"\n"));
  if (this.transactionItems) {
    this.transactionItems.push(gzdata);
    this.updateIndex(arg.id, gzdata.length, callback);
  } else {
    fs.write(self.fda, gzdata, 0, gzdata.length, null, function(err, written, buffer) {
      if (err) {
        return callback(err);
      }
      self.updateIndex(arg.id, gzdata.length, callback);
    });
  }
}

// adds a deleted record to the ijod and removes from index
IJOD.prototype.delData = function(arg, callback) {
  if(!arg || !arg.id) return callback("invalid arg");
  arg.id = arg.id.toString(); // safety w/ numbers
  if(!arg.at) arg.at = Date.now();
  arg.type = "delete";
  var self = this;
  var gzdata = zlib.compress(new Buffer(JSON.stringify(arg)+"\n"));
  fs.write(self.fda, gzdata, 0, gzdata.length, null, function(err, written, buffer) {
    if (err) {
      return callback(err);
    }

    var at = self.len;
    self.len += gzdata.length;
    self.db.execute("DELETE FROM ijod WHERE id = ?", [arg.id], callback);
  });
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
    var data = zlib.decompress(buf);
    return callback(err, arg.raw ? data : stripper(data));
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
    var data = zlib.decompress(buf);
    return callback(err, arg.raw ? data : stripper(data));
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
    var s = buf.toString("utf8");
    return s.slice(s.indexOf('{',1),s.lastIndexOf('}',s.length-3)+1); // -3 accounts for }\n
}
