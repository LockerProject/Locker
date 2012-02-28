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
var locker;
var lutil = require('lutil');
var request = require("request");
var crypto = require("crypto");
var async = require("async");
var url = require("url");
var fs = require('fs');

var CollectionDataStore = require('collectionDataStore');
var collectionDataStore = new CollectionDataStore();

exports.init = function(mongo, _locker) {
    locker = _locker;
    var mongoCollection = mongo.collections.place;
    collectionDataStore.init(mongo, 'place', locker);

    collection = mongoCollection;
    collection.ensureIndex({"id":1},{unique:true},function() {});
    db = mongo.dbClient;

};

// inherit from collectionDataStore
exports.state = collectionDataStore.state;
exports.clear = collectionDataStore.clear;
exports.get = collectionDataStore.get;
exports.getOne = collectionDataStore.getOne;
exports.getAll = collectionDataStore.getAll;
exports.getLastObjectID = collectionDataStore.getLastObjectID;
exports.getTotalCount = collectionDataStore.getTotalCount;
exports.getSince = collectionDataStore.getSince;

exports.saveCommonPlace = function(placeInfo, cb) {
    placeInfo.lat = +(placeInfo.lat.toFixed(5));
    placeInfo.lng = +(placeInfo.lng.toFixed(5));
    var hash = createId(placeInfo.lat+':'+placeInfo.lng+':'+placeInfo.at);
    var query = [{id:hash}];
    placeInfo.id = hash;
    collection.findAndModify({$or:query}, [['_id','asc']], {$set:placeInfo}, {safe:true, upsert:true, new: true}, function(err, doc) {
        if (err) {
            return cb(err);
        }
        collectionDataStore.updateState();
        locker.ievent(lutil.idrNew("place","places",doc.id), doc);
        return cb(undefined, doc);
    });
}

exports.updatePlace = function(place, cb) {
    if(!place || !place.id) return cb("missing valid place");
    var query = [{id:place.id}];
    delete place._id;
    collection.findAndModify({$or:query}, [['_id','asc']], {$set:place}, {safe:true, upsert:true, new: true}, function(err, doc) {
        if (err) return cb(err);
        collectionDataStore.updateState();
        locker.ievent(lutil.idrNew("place","places",doc.id), doc, "update");
        return cb(undefined, doc);
    });
};


exports.getNetwork = function(network, cbEach, cbDone) {
    collectionDataStore.findWrap({"network":network}, {}, cbEach, cbDone);
};

exports.getFrom = function(network, from, cbEach, cbDone) {
    collectionDataStore.findWrap({"network":network, "fromID":from}, {}, cbEach, cbDone);
};

function createId(hash) {
    var sha1 = crypto.createHash("sha1");
    sha1.update(hash);
    return sha1.digest("hex");
}