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

function IJOD(name, indexedFields) {    
    this.name = name;
    this.indexFile = name + '/' + name + '.index';
    this.dataFile = name + '/' + name + '.json';
    this.dbFile = name + '/' + name + '.db';
    this.indexListFile = name + '/' + name + '.json';
    this.indexedFields = indexedFields;
    this.db = new sqlite.Database();
}

exports.IJOD = IJOD;

IJOD.prototype.init = function(callback) {
    var self = this;
    validateIJOD(self.name, function(err) {
        self.dataStream = fs.createWriteStream(self.dataFile, {'flags':'a', 'encoding': 'utf-8'});
        self.indexStream = fs.createWriteStream(self.indexFile, {'flags':'a', 'encoding': 'utf-8'});
        self.db.open(self.dbFile, function(error) {
            readIndex(self.indexFile, function(indexArray) {
                self.index = indexArray;
                lfs.readObjectsFromFile(self.indexListFile, function(readIndexedFields) {
                    if(!self.indexedFields && readIndexedFields)
                        self.indexedFields = readIndexedFields;
                    if(self.indexedFields) {
                        self.addIndicies(0, function(err) {
                            callback();
                        });
                    } else {
                        callback();
                    }
                });
            });
        });
    });
}

IJOD.prototype.addRecord = function(record) {
    var str = JSON.stringify(record) + '\n';
    this.dataStream.write(str);
        var end = Buffer.byteLength(str);
    str = null;
    if(this.index.length > 0)
        end += this.index[this.index.length - 1];
    this.index.push(end);
    this.indexStream.write(end + '\n');
    for(var i in this.indexedFields)
        this.addIndexedValue(this.indexedFields[i], record);
}

IJOD.prototype.getRecordByID = function(recordID, callback) {
    var start = recordID >= 0? this.index[recordID]: 0;
    var end = recordID < this.index.length? this.index[recordID + 1]: null;
    readObjectsFromFile(name + '/' + name + '.json', start, end, function(err, docs) {
        if(docs && docs.length)
            docs = docs[0];
        callback(err, docs);
    });
}

IJOD.prototype.getAfterRecordID = function(recordID, callback) {
    var start = recordID >= 0? this.index[recordID]: 0;
    readObjectsFromFile(this.name + '/' + this.name + '.json', start, null, callback);
}

IJOD.prototype.getAfterFieldsValueEquals = function(fieldName, fieldValue, callback) {
    findGreaterThanIndex(fieldName, fieldValue, function(err, docs) {
        if(err)
            callback(err);
        else if(docs[0])
            this.getAfterRecordID(docs[0].mainIndex - 1, callback);
        else
            callback(null, []);
    });
}

IJOD.prototype.close = function() {
    if(this.dataStream) {
        this.dataStream.end();
        this.dataStream.destory();
    }
    if(this.indexStream) {
        this.indexStream.end();
        this.indexStream.destory();
    }
}


IJOD.prototype.addIndexedValue = function(field, record) {
    var sql = 'INSERT OR REPLACE INTO ' + tableName(field.fieldName) +' (indexedValue, mainIndex) VALUES (?, ?);';
    this.db.execute(sql, [getFieldValue(record, field.fieldName), this.index.length - 1], function(err) {
        if(err)
            console.error(err);
    });
}

IJOD.prototype.findGreaterThanIndex = function(fieldName, value, callback) {
    var sql = 'SELECT mainIndex FROM ' + tableName(fieldName) + ' WHERE indexedValue > ? ORDER BY indexedValue LIMIT 1;';
    this.db.execute(sql, [value], callback);
}

IJOD.prototype.addIndicies = function(i, callback) {
    if(i == this.indexedFields.length) {
        callback();
        return;
    }
    var field = this.indexedFields[i];
    var self = this;
    this.db.execute('CREATE TABLE ' + tableName(field.fieldName) + ' (indexedValue ' + field.fieldType + ', mainIndex INTEGER);', function(err) {
        if(err)
            callback(err);
        else
            self.addIndicies(i+1, callback);
    });
}



exports.createIJOD = function(name, indexedFields, callback) {
    if(!callback && typeof indexedFields == 'function') {
        callback = indexedFields;
        indexedFields = null;
    }
    var ijod = new IJOD(name, indexedFields);
    ijod.init(function() {
        callback(ijod);
    });
}

function tableName(fieldName) {
    return fieldName.replace(/\./g, '_');
}

function getFieldValue(record, fieldName) {
    var value = record[fieldName];
    if(fieldName.indexOf('.') > 0) {
        var fields = fieldName.split('.');
        value = record;
        for(var i in fields) {
            value = value[fields[i]];
            if(value == null || value == undefined)
                return;
        }
    }
    return value;
}

function validateIJOD(name, callback) {
    fs.readdir(name, function(err, files) {
        if(err) //dir doesn't exist
            fs.mkdir(name, 0755, callback);
        else
            callback();
    });
}


function readIndex(path, callback) {
    var stream = fs.createReadStream(path, {'encoding': 'utf-8'});
    var data = "";
    stream.on('data', function(newData) {
        data += newData;
    });
    stream.on('end', function() {
        var itemStrings = data.split('\n');
        var items = [];
        for(var i = 0; i < itemStrings.length; i++) {
            if(itemStrings[i])
                items.push(parseInt(itemStrings[i]));
        }
        callback(items);
    });
    stream.on('error', function(err) {
        callback([]);
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