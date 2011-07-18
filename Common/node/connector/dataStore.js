/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var IJOD = require('ijod').IJOD;

var ijodFiles = {};
var mongo;
var mongoID = 'id';

exports.init = function(mongoid, _mongo) {
    mongo = _mongo;
    mongoID = mongoid;
    for (var i in mongo.collections) {
        if (!ijodFiles[i]) {
            ijodFiles[i] = new IJOD(i);
        }
    }
}

exports.addCollection = function(name) {
    if(!mongo.collections[name])
        mongo.addCollection(name);
}

function now() {
    return new Date().getTime();
}

// arguments: type should match up to one of the mongo collection fields
// object will be the object to persist
// options is optional, but if it exists, available options are: strip + timestamp
// strip is an array of properties to strip off before persisting the object.
// options = {strip: ['person','checkins']}, for example
// timeStamp will be the timestamp stored w/ the record if it exists, otherwise, just use now.
//
exports.addObject = function(type, object, options, callback) {
    var timeStamp = now();
    if (arguments.length == 3) callback = options;
    if (typeof options == 'object') {
        for (var i in options['strip']) {
            object[options['strip'][i]].delete
        }
        if (options['timeStamp']) {
            timeStamp = options['timeStamp'];
        }
    }
    ijodFiles[type].addRecord(timeStamp, object, function(err) {
        if (err)
            callback(err); 
        setCurrent(type, object, callback);
    })
}

// same deal, except no strip option, just timestamp is available currently
exports.removeObject = function(type, id, options, callback) {
    var timeStamp = now();
    if (arguments.length == 3) callback = options;
    if (typeof options == 'object') {
        if (options['timeStamp']) {
            timeStamp = options['timeStamp'];
        }
    }
    var record = {deleted: timeStamp};
    record[mongoID] = id;
    ijodFiles[type].addRecord(timeStamp, record, function(err) {
        if (err)
            callback(err);
        removeCurrent(type, id, callback);
    })
}


// mongos
function getMongo(type, id, callback) {
    var m = mongo.collections[type];
    if(!m) 
        callback(new Error('invalid type:' + type), null);
    else if(!(id && (typeof id === 'string' || typeof id === 'number')))
        callback(new Error('bad id:' + id), null);
    else
        return m;
}

exports.queryCurrent = function(type, query, options) {
    query = query || {};
    options = options || {};
    var m = mongo.collections[type];
    if(!m) 
        callback(new Error('invalid type:' + type), null);
    else
        return m.find(query, options);
}

exports.getAllCurrent = function(type, callback, options) {
    options = options || {};
    var m = mongo.collections[type];
    if(!m) 
        callback(new Error('invalid type:' + type), null);
    else
        m.find({}, options).toArray(callback);
}

exports.getCurrent = function(type, id, callback) {
    var m = getMongo(type, id, callback);
    if(m) {
        var query = {};
        query[mongoID] = id;
        m.findOne(query, callback);
    }
}

setCurrent = function(type, object, callback) {
    var m = getMongo(type, object[mongoID], callback);
    if(m) {
        var query = {};
        query[mongoID] = object[mongoID];
        m.update(query, object, {upsert:true, safe:true}, callback);
    }
}

removeCurrent = function(type, id, callback) {
    var m = getMongo(type, id, callback);
    if(m) {
        var query = {};
        query[mongoID] = id;
        m.remove(query, callback);
    }
}
