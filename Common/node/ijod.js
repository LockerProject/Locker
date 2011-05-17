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


exports.createIJOD = function(name, indexedFields, callback) {
    if(!callback && typeof indexedFields == 'function') {
        callback = indexedFields;
        indexedFields = null;
    }
    var self = {
        name:name,
        indexFile : name + '/' + name + '.index',
        dataFile : name + '/' + name + '.json',
        dbFile : name + '/' + name + '.db',
        indexListFile : name + '/' + name + '.json',
        indexedFields:indexedFields
    };
    var db = new sqlite.Database();
    validateIJOD(self.name, function(err) {
        self.dataStream = fs.createWriteStream(self.dataFile, {'flags':'a', 'encoding': 'utf-8'});
        self.indexStream = fs.createWriteStream(self.indexFile, {'flags':'a', 'encoding': 'utf-8'});
        db.open(self.dbFile, function(error) {
            readIndex(self.indexFile, function(indexArray) {
                self.index = indexArray;
                lfs.readObjectsFromFile(self.indexListFile, function(readIndexedFields) {
                    if(!self.indexedFields && readIndexedFields)
                        self.indexedFields = readIndexedFields;
                    if(self.indexedFields) {
                        addIndicies(0, function(err) {
                            addFunctions();
                            callback(self);
                        });
                    } else {    
                        addFunctions();
                        callback(self);
                    }
                });
            });
        });
    });
    
    function addFunctions() {
        self.addRecord = function(record) {
            var str = JSON.stringify(record) + '\n';
            self.dataStream.write(str);
                var end = Buffer.byteLength(str);
            str = null;
            if(self.index.length > 0)
                end += self.index[self.index.length - 1];
            self.index.push(end);
            self.indexStream.write(end + '\n');
            for(var i in self.indexedFields)
                addIndexedValue(self.indexedFields[i], record);
        }
        self.getRecordByID = function(recordID, callback) {
            var start = recordID >= 0? self.index[recordID]: 0;
            var end = recordID < self.index.length? self.index[recordID + 1]: null;
            readObjectsFromFile(name + '/' + name + '.json', start, end, function(err, docs) {
                if(docs && docs.length)
                    docs = docs[0];
                callback(err, docs);
            });
        }
        self.getAfterRecordID = function(recordID, callback) {
            var start = recordID >= 0? self.index[recordID]: 0;
            readObjectsFromFile(name + '/' + name + '.json', start, null, callback);
        }
        self.getAfterFieldsValueEquals = function(fieldName, fieldValue, callback) {
            findGreaterThanIndex(fieldName, fieldValue, function(err, docs) {
                if(err)
                    callback(err);
                else if(docs[0])
                    self.getAfterRecordID(docs[0].mainIndex - 1, callback);
                else
                    callback(null, []);
            });
        }
        self.close = function() {
            self.dataStream.end();
            self.dataStream.destory();
            self.indexStream.end();
            self.indexStream.destory();
        }
    }
    
    function addIndexedValue(field, record) {
        var sql = 'INSERT OR REPLACE INTO ' + tableName(field.fieldName) +' (indexedValue, mainIndex) VALUES (?, ?);';
        db.execute(sql, [getFieldValue(record, field.fieldName), self.index.length - 1], function(err) {
            if(err)
                console.error(err);
        });
    }
    
    function findGreaterThanIndex(fieldName, value, callback) {
        var sql = 'SELECT mainIndex FROM ' + tableName(fieldName) + ' WHERE indexedValue > ? ORDER BY indexedValue LIMIT 1;';
        db.execute(sql, [value], callback);
    }
    function addIndicies(i, callback) {
        if(i == self.indexedFields.length) {
            callback();
            return;
        }
        var field = self.indexedFields[i];
        db.execute('CREATE TABLE ' + tableName(field.fieldName) + ' (indexedValue ' + field.fieldType + ', mainIndex INTEGER);', function(err) {
            if(err)
                callback(err);
            else
                addIndicies(i+1, callback);
        });
    }
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