/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var fs = require('fs');
var lutil = require('lutil');

module.exports = function() {
  var collection, db, logger;
  var client = {};

  client.init = function(mongo, collectionName, locker) {
    collection = mongo.collections[collectionName];
    collection.ensureIndex({"id":1},{unique:true},function() {});
    db = mongo.dbClient;
    logger = require("logger");
  }

  client.state = function(callback) {
    client.getTotalCount(function(err, countInfo) {
      if(err) return callback(err);
      client.getLastObjectID(function(err, lastObject) {
        if(err) return callback(err);
        var objId = '000000000000000000000000';
        if (lastObject) objId = lastObject._id.toHexString();
        var updated = Date.now();
        try {
          var js = JSON.parse(path.join(lockerInfo.workingDirectory, fs.readFileSync('state.json')));
          if(js && js.updated) updated = js.updated;
        } catch(E) {}
        return callback(undefined, {ready:1, count:countInfo, updated:updated, lastId:objId});
      });
    });
  }
  client.clear = function() {
    collection.drop.apply(collection, arguments);
  };

  client.getTotalCount = function() {
    collection.count.apply(collection, arguments);
  };

  client.getSince = function(objId, cbEach, cbDone) {
    client.findWrap({"_id":{"$gt":new db.bson_serializer.ObjectID(objId)}}, {sort:{_id:-1}}, cbEach, cbDone);
  }

  client.getLastObjectID = function(cbDone) {
    collection.find({}, {fields:{_id:1}, limit:1, sort:{_id:-1}}).nextObject(cbDone);
  }

  client.get = function(id, callback) {
    var or = []
    try {
      or.push({_id:new db.bson_serializer.ObjectID(id)});
    } catch(E) {
      // might be the regular id, not _id, in which case
    }
    or.push({id:id});
    collection.findOne({$or:or}, callback);
  }

  client.getAll = function(fields, callback) {
    collection.find({}, fields, callback);
  };

  client.getOne = function(id, callback) {
    collection.find({"id":id}, function(error, cursor) {
      if (error) return callback(error, cursor);
      cursor.nextObject(function(err, doc) {
        if (err) return callback(err);
        callback(err, doc);
      });
    });
  };

  client.findWrap = function(query, options, cbEach, cbDone) {
    var cursor = collection.find(query);
    if (options.sort) cursor.sort(options.sort);
    if (options.limit) cursor.limit(options.limit);
    cursor.each(function(err, item) {
      if (item === null) return cbDone();
      cbEach(item);
    });
  }

  var writeTimer = false;
  client.updateState = function() {
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(function() {
      lutil.atomicWriteFileSync("state.json", JSON.stringify({updated:Date.now()}));
    }, 5000);
  }

  return client;
}

