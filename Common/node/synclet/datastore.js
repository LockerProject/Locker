/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var IJOD = require('../ijod').IJOD
  , lconfig = require('../lconfig')
  , lmongoclient = require('../lmongoclient')(lconfig.mongo.host, lconfig.mongo.port, 'synclets', [])
  , ijodFiles = {}
  , deepCompare = require('../deepCompare')
  , mongo
  , mongoIDs = {}
  ;

exports.init = function(callback) {
    if (mongo) return callback();
    lmongoclient.connect(function(_mongo) {
        mongo = _mongo;
        callback();
    });
}

exports.addCollection = function(name, dir, id) {
    mongoIDs[dir + "_" + name] = id;
    if(!mongo.collections[dir + "_" + name])
        mongo.addCollection(dir + "_" + name);
    if(!ijodFiles[dir + "_" + name])
        ijodFiles[dir + "_" + name] = new IJOD(name, dir);
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
    setCurrent(type, object, function(err, newType, doc) {
        if (newType === 'same') return callback(err, newType, doc);
        ijodFiles[type].addRecord(timeStamp, object, function(err) {
            callback(err, newType, doc);
        });
    });
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
    record[mongoIDs[type]] = id;
    ijodFiles[type].addRecord(timeStamp, record, function(err) {
        if (err)
            callback(err);
        removeCurrent(type, id, callback);
    })
}


// mongos
function getMongo(type, id, callback) {
    var m = mongo.collections[type];
    if(!m) {
        try {
            mongo.addCollection(type);
        } catch (E) {
            return callback(E, []);
        }
        m = mongo.collections[type];
    }
    else if(!(id && (typeof id === 'string' || typeof id === 'number')))
        return callback(new Error('bad id:' + id), null);
    return m;
}

exports.queryCurrent = function(type, query, options, callback) {
    query = query || {};
    options = options || {};
    var m = mongo.collections[type];
    if(!m) {
        mongo.addCollection(type);
        m = mongo.collections[type];
    }
    m.find(query, options).toArray(callback);
}

exports.getAllCurrent = function(type, callback, options) {
    options = options || {};
    var m = mongo.collections[type];
    if(!m) {
        try {
            mongo.addCollection(type);
        } catch (E) {
            callback(E, []);
            return;
        }
        m = mongo.collections[type];
    }
    m.find({}, options).toArray(callback);
}

exports.getCurrent = function(type, id, callback) {
    var m = getMongo(type, id, callback);
    if(m && id) {
        var query = {_id: mongo.db.bson_serializer.ObjectID(id)};
        m.findOne(query, callback);
    } else {
        callback('broke!', []);
    }
}

function setCurrent(type, object, callback) {
    if (type && object && callback) {
        var m = getMongo(type, object[mongoIDs[type]], callback);
        if(m) {
            var query = {};
            query[mongoIDs[type]] = object[mongoIDs[type]];
            m.findAndModify(query, [['_id','asc']], object, {upsert:true, safe:true}, function(err, doc) {
                if (deepCompare(doc, {})) {
                    m.findOne(query, function(err, newDoc) {
                        callback(err, 'new', newDoc);
                    });
                } else {
                    var id = doc._id;
                    delete doc._id;
                    if (deepCompare(doc, object)) {
                        callback(err, 'same', doc);
                    } else {
                        doc._id = id;
                        callback(err, 'update', doc);
                    }
                }
            });
        }
    } else {
        console.error('failed to set current, l145 of common/node/synclet/datastore');
        console.error(type)
        console.error(object)
        console.error(callback);
    }
}

function removeCurrent(type, id, callback) {
    var m = getMongo(type, id, callback);
    if(m) {
        var query = {};
        query[mongoIDs[type]] = id;
        m.remove(query, callback);
    }
}
