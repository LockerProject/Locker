/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var collection;
var db;
var lutil = require('lutil');
var locker = require('locker');
var lmongoutil = require("lmongoutil");
var url = require('url');
var inserters = require('./inserters');

exports.init = function(mongoCollection, mongo) {
    collection = mongoCollection;
    db = mongo.dbClient;
    inserters.init(collection);
}

exports.getTotalCount = function(callback) {
    collection.count(callback);
}
exports.getAll = function(fields, callback) {
    collection.find({}, fields, callback);
}

exports.get = function(id, callback) {
    collection.findOne({_id: new db.bson_serializer.ObjectID(id)}, callback);
}

exports.getSince = function(objId, cbEach, cbDone) {
    collection.find({"_id":{"$gt":lmongoutil.ObjectID(objId)}}, {sort:{_id:-1}}).each(function(err, item) {
        if (item != null) cbEach(item);
        else cbDone();
    });
}

exports.getLastObjectID = function(cbDone) {
    collection.find({}, {fields:{_id:1}, limit:1, sort:{_id:-1}}).nextObject(cbDone);
}

exports.clear = function(callback) {
    collection.drop(callback);
}

var writeTimer = false;
function updateState() {
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(function() {
        try {
            lutil.atomicWriteFileSync("state.json", JSON.stringify({updated:Date.now()}));
        } catch (E) {}
    }, 5000);
}

exports.addData = function(type, data, cb) {
    // shim to send events, post-add stuff
    if(typeof inserters[type] === 'function') inserters[type](data, type, function(err, doc) {
        if(doc && doc._id) {
            var idr = lutil.idrNew("contact", "contacts", doc._id);
            locker.ievent(idr, doc);
        }
        cb(err, doc);
    });
}
