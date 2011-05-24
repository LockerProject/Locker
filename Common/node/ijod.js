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

var fs = require('fs'),
    lfs = require(__dirname + '/lfs'),
    sqlite = require('sqlite');

function IJOD(name) {
    this.name = name;
//    this.dataFile = name + '/' + name + '.json';
    this.dataFileName = name + '.json';
    this.dbFile = name + '/' + name + '.db';
    this._currentByteOffset = 0;
    this.db = new sqlite.Database();
}

exports.IJOD = IJOD;

IJOD.prototype.init = function(callback) {
    var self = this;
    validateIJOD(self.name, function(err) {
        self.dataStream = fs.createWriteStream(self.dataFile, {'flags':'a', 'encoding': 'utf-8'});
        self.db.open(self.dbFile, function(error) {
            self._addIndices(function(err) {
                callback();
            });
        });
    });
}

IJOD.prototype.addRecord = function(objectID, timeStamp, record) {
    var str = JSON.stringify(record) + '\n';
    this.dataStream.write(str);
    var end = Buffer.byteLength(str);
    str = null;
    this._getEndByteOffset(function(err, byteEnd) {
        this._addIndexedValues(byteEnd, end,  record);
    });
}

IJOD.prototype.getAfterTimeStamp = function(timeStamp, callback) {
    var sql = 'SELECT byteStart FROM indices WHERE timeStamp > ? ORDER BY byteStart LIMIT 1;';
    this.db.execute(sql, [timeStamp], function(err, docs) {
        if(err)
            callback(err, docs);
        else {
            readObjectsFromFile(this.name + '/' + this.name + '.json', docs[0].byteStart, null, callback);
        }
    });
}

IJOD.prototype.close = function() {
    if(this.dataStream) {
        this.dataStream.end();
        this.dataStream.destory();
    }
}

IJOD.prototype._addIndexedValues = function(byteStart, byteEnd, timeStamp, objectID, callback) {
    var sql = 'INSERT INTO indices (byteStart, byteEnd, timeStamp, objectID) VALUES (?, ?, ?, ?);';
    this.db.execute(sql, [byteStart, byteEnd, timeStamp, objectID], callback);
}

IJOD.prototype._getEndByteOffset = function(callback) {
    var sql = 'SELECT byteEnd FROM indices ORDER BY byteEnd DESC LIMIT 1;';
    this.db.execute(sql, function(err, docs) {
        if(err) {
            callback(err, docs);
        } else {
            callback(null, docs[0].byteEnd);
        }
    });
}

IJOD.prototype._addIndices = function(callback) {
    this.db.execute('CREATE TABLE indices (recordID INTEGER PRIMARY KEY, timeStamp INTEGER, objectID TEXT);', function(err) {
        if(err && err.message != 'table indices already exists')
            console.error('err!', err);
        callback(err);
    });
}

function validateIJOD(name, callback) {
    fs.readdir(name, function(err, files) {
        if(err) //dir doesn't exist
            fs.mkdir(name, 0755, callback);
        else
            callback();
    });
}

function readObjectsFromFile(path, start, end, callback) {
    var options = {'encoding': 'utf-8'};
    if(start) {
        options.start = start;
        if(end && end > start)
            options.end = end;
    }
    var stream = fs.createReadStream(path, options);
    var data = "";
    stream.on('data', function(newData) {
        data += newData;
    });
    stream.on('end', function() {
        var itemStrings = data.split('\n');
        var items = [];
        for(var i = 0; i < itemStrings.length; i++) {
            if(itemStrings[i]) {
                try {
                    items.push(JSON.parse(itemStrings[i]));
                } catch(err) {
                    console.error('JSON parse error for string:', itemStrings[i], '\nerr:', err);
                }
            }
        }
        callback(null, items);
    });
    stream.on('error', function(err) {
        callback(err, []);
    });
}