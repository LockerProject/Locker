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
                        self._addIndicies(0, function(err) {
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
    this._addIndexedValues(this.index.length - 1, record);
}

IJOD.prototype.getRecordByID = function(recordID, callback) {
    var start = recordID > 0? this.index[recordID - 1]: 0;
    var end = recordID < this.index.length? this.index[recordID]: null;
    readObjectsFromFile(this.name + '/' + this.name + '.json', start, end, function(err, docs) {
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
    var self = this;
    this._findGreaterThanIndex(fieldName, fieldValue, function(err, docs) {
        if(err)
            callback(err);
        else if(docs[0])
            self.getAfterRecordID(docs[0].recordID - 1, callback);
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


IJOD.prototype._addIndexedValues = function(recordID, record) {
    var sql = 'INSERT INTO indicies (' + this._getIndexFieldNames(recordID);
    var values = [recordID];
    for(var i = 0; i < this.indexedFields.length; i++) {
        var field = this.indexedFields[i].fieldName;
        values.push(getFieldValue(record, field));
    }
    sql += ') VALUES (';
    for(var i = 0; i < this.indexedFields.length; i++)
        sql += '?, ';
    sql += '?);';
    this.db.execute(sql, values, function(err) {
        if(err)
            console.error(err);
    });
}

IJOD.prototype._findGreaterThanIndex = function(fName, value, callback) {
    var sql = 'SELECT recordID FROM indicies WHERE ' + fieldName(fName) + ' > ? ORDER BY recordID LIMIT 1;';
    this.db.execute(sql, [value], callback);
}

IJOD.prototype._addIndicies = function(i, callback) {
    if(i == this.indexedFields.length) {
        callback();
        return;
    }
    var field = this.indexedFields[i];
    var self = this;
    this.db.execute('CREATE TABLE indicies (' + this._getIndexFieldNamesAndTypes() + ');', function(err) {
        if(err)
            console.error('err!', err);
        callback(err);
    });
}

IJOD.prototype._getIndexFieldNames = function() {
    var str = 'recordID, ';
    for(var i = 0; i < this.indexedFields.length; i++) {
        var field = this.indexedFields[i];
        str += fieldName(field.fieldName);
        if(i < this.indexedFields.length - 1) 
            str += ', ';
    }
    return str;
}

IJOD.prototype._getIndexFieldNamesAndTypes = function() {
    var str = 'recordID INTEGER, ';
    for(var i = 0; i < this.indexedFields.length; i++) {
        var field = this.indexedFields[i];
        str += fieldName(field.fieldName) + ' ' + field.fieldType;
        if(i < this.indexedFields.length - 1) 
            str += ',';
    }
    return str;
}



function fieldName(fieldName) {
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