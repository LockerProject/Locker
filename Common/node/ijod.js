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
    lfs = require(__dirname + '/lfs');

function createIJOD(name, callback) {
    var self = {
        name:name,
        indexFile : name + '/' + name + '.index',
        dataFile : name + '/' + name + '.json'
    };
    
    validateIJOD(self.name, function(err) {
        readIndex(self.indexFile, function(indexArray) {
            self.index = indexArray;
            
            self.addRecord = function(record) {
                var end = appendObjectToFile(record, self.dataFile);
                if(self.index.length > 0)
                    end += self.index[self.index.length - 1];
                self.index.push(end);
                appendToIndex(self.indexFile, end);
            }
            self.getAfterRecordID = function(recordID, callback) {
                var start = recordID >= 0? indexArray[recordID]: 0;
                readObjectsfromFile(name + '/' + name + '.json', start, null, callback);
            }
            
            callback(self);
        });
    });
}



function validateIJOD(name, callback) {
    fs.readdir(name, function(err, files) {
        if(err) { //dir doesn't exist
            fs.mkdir(name, 0755, function(err) {
                done();
            });
        } else {
            done();
        }
        function done() {
            try {
                touchAll(name);
                callback();
            } catch(err) {
                callback(err);
            }
        }
    });
}

function touchAll(name) {
    touch(name + '/' + name + '.json');
    touch(name + '/' + name + '.index');
}

function touch(path) {
    fs.createWriteStream(path, {'flags':'a', 'encoding': 'utf-8'}).end();
}

/**
 * Appends an object as lined-delimited JSON to the file at the specified path
 */
function appendObjectToFile(object, path) {
    var stream = fs.createWriteStream(path, {'flags':'a', 'encoding': 'utf-8'});
    var str = JSON.stringify(object) + '\n';
    stream.write(str);
    stream.end();
    return str.length;
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

function appendToIndex(path, value) {
    var stream = fs.createWriteStream(path, {'encoding': 'utf-8', 'flags':'a'});
    stream.write(value + '\n');
    stream.end();
}

function readObjectsfromFile(path, start, end, callback) {
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
            if(itemStrings[i])
                items.push(JSON.parse(itemStrings[i]));
        }
        callback(items);
    });
    stream.on('error', function(err) {
        callback([]);
    });
}

var IJODDiscreteIndex = function(path) {
    var self = this;
    self._index = {};
    self._path = path;
    try {
        self._index = JSON.parse(fs.readFileSync(self._path));
    } catch(err) {}
    self.put = function(key, value) {
        if(!self._index.key)
            self._index.key = [value];
        else {
            var notAlready = true;
            self._index.key.forEach(function(thisValue) {
                if(value == thisValue)
                    notAlready = false;
            });
            if(notAlready)
                self._index.key.push(value);
        }
        fs.writeFile(self._path, JSON.stringify(self._index));
    }
    self.get = function(key) {
        return self._index.key;
    }
}

var IJODContinuousIndex = function(path) {
    var self = this;
    self._array = [];
    self._path = path;
    try {
        self._array = JSON.parse(fs.readFileSync(self._path));
    } catch(err) {}
    self.addPair = function(key, value) {
        var obj = {key:key, value:value};
        self._array.push(obj);
        self._array.sort(function(a, b) {
            if(a.key < b.key)
                return -1;
            if(a.key > key.b)
                return 1;
            return 0;
        });
        fs.writeFile(self._path, JSON.stringify(self._index));
    }
    self.find = function(value) {
        //search for value
        for(var i in self.array) {
            if(self.array[i] >= value)
                return i;
        }
    }
}


createIJOD('testijod', function(ijod) {
    ijod.addRecord({'ts':new Date().getTime(), 'data': {'screen_name':'smurthas', 'id_str':'1523467'}});
    ijod.addRecord({'ts':new Date().getTime(), 'data': {'screen_name':'jsoncavnr', 'id_str':'i love music'}});
    ijod.addRecord({'ts':new Date().getTime(), 'data': {'screen_name':'jeremie', 'id_str':'42'}});
    ijod.getAfterRecordID(-1, function(objects) {
        console.log('objs!:' + JSON.stringify(objects));
    });
    console.log('done!!');
});