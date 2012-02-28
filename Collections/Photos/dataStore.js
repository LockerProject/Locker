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
var logger;
var crypto = require("crypto");
var url = require('url');
var lmongoutil = require("lmongoutil");
var locker;

var CollectionDataStore = require('collectionDataStore');
var collectionDataStore = new CollectionDataStore();

exports.init = function(mongo, _locker) {
    locker = _locker;
    collection = mongo.collections.photo;
    collectionDataStore.init(mongo, 'photo', locker);

    db = mongo.dbClient;
    logger = require("logger");
}

exports.saveCommonPhoto = function(photoInfo, cb) {
    // This is the only area we do basic matching on right now.  We'll do more later
    var query = [{url:photoInfo.url}];
    if (photoInfo.title) {
        query.push({name:photoInfo.title});
    }
    if (!photoInfo.id) photoInfo.id = createId(photoInfo.url, photoInfo.name);
    collection.findAndModify({$or:query}, [['_id','asc']], {$set:photoInfo}, {safe:true, upsert:true, new: true}, function(err, doc) {
        if (!err) {
            collectionDataStore.updateState();
            locker.ievent(lutil.idrNew("photo", "photos", doc.id), doc);
            return cb(undefined, doc);
        }
        cb(err);
    });
}
/**
* Common function to create an id attribute for a photo entry
*
* This currently uses the only matched attributes of the url and the name to generate a hash.
*/
function createId(url, name) {
    var sha1 = crypto.createHash("sha1");
    sha1.update(url);
    if (name) sha1.update(name);
    return sha1.digest("hex");
}


exports.getTotalCount = collectionDataStore.getTotalCount;
exports.getAll = collectionDataStore.getAll;
exports.get = collectionDataStore.get;
exports.clear = collectionDataStore.clear;
exports.getSince = collectionDataStore.getSince;
exports.getLastObjectID = collectionDataStore.getLastObjectID;