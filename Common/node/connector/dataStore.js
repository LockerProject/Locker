/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var IJOD = require('../ijod').IJOD;

var ijodFiles = {};
var mongoCollections;

var mongoID = 'id';

exports.init = function(mongoid, theMongoCollections) {
    mongoID = mongoid;
    mongoCollections = theMongoCollections;
    for (var i in mongoCollections) {
        if (!ijodFiles[i]) {
            ijodFiles[i] = new IJOD(i);
        }
    }
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
    var mongo = mongoCollections[type];
    if(!mongo) 
        callback(new Error('invalid type:' + type), null);
    else if(!(id && (typeof id === 'string' || typeof id === 'number')))
        callback(new Error('bad id:' + id), null);
    else
        return mongo;
}

exports.getAllCurrent = function(type, callback) {
    var mongo = mongoCollections[type];
    if(!mongo) 
        callback(new Error('invalid type:' + type), null);
    else
        mongo.find({}, {}).toArray(callback);
}

exports.getCurrent = function(type, id, callback) {
    var mongo = getMongo(type, id, callback);
    if(mongo) {
        var query = {};
        query[mongoID] = id;
        mongo.findOne(query, callback);
    }
}

setCurrent = function(type, object, callback) {
    var mongo = getMongo(type, object[mongoID], callback);
    if(mongo) {
        var query = {};
        query[mongoID] = object[mongoID];
        mongo.update(query, object, {upsert:true, safe:true}, callback);
    }
}

removeCurrent = function(type, id, callback) {
    var mongo = getMongo(type, id, callback);
    if(mongo) {
        var query = {};
        query[mongoID] = id;
        mongo.remove(query, callback);
    }
}
