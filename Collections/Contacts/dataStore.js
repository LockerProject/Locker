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
var lmongoutil = require('lmongoutil');
var url = require('url');
var inserters = require('./inserters');
var locker;

var CollectionDataStore = require('collectionDataStore');
var collectionDataStore = new CollectionDataStore();

exports.init = function(mongo, _locker) {
  locker = _locker;
  collection = mongo.collections.contact;
  collectionDataStore.init(mongo, 'contact', locker);

  db = mongo.dbClient;
  inserters.init(collection);
}

exports.state = collectionDataStore.state;
exports.clear = collectionDataStore.clear;
exports.get = collectionDataStore.get;
exports.getAll = collectionDataStore.getAll;
exports.getLastObjectID = collectionDataStore.getLastObjectID;
exports.getTotalCount = collectionDataStore.getTotalCount;
exports.getSince = collectionDataStore.getSince;

exports.addData = function(type, data, cb) {
  // shim to send events, post-add stuff
  if(typeof inserters[type] !== 'function') return cb(new Error('unhandled data type,' + type));
  inserters[type](data, type, function(err, doc) {
    if(err) return cb(err);
    if(doc && doc._id) {
      var idr = lutil.idrNew('contact', 'contacts', doc._id);
      locker.ievent(idr, doc);
    }
    cb(err, doc);
  });
}
