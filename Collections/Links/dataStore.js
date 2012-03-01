/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var logger;
var fs = require('fs');
var lutil = require('lutil');
var lmongoutil = require("lmongoutil");
var CollectionDataStore = require('collectionDataStore');

// in the future we'll probably need a visitCollection too
var linkCollection, encounterCollection, queueCollection, db;
var linkCDS = new CollectionDataStore();
var encounterCDS = new CollectionDataStore();
var queueCDS = new CollectionDataStore();

exports.init = function(mongo, locker) {
    db = mongo.dbClient;
    logger = require("logger");

    linkCDS.init(mongo, 'link', locker);
    encounterCDS.init(mongo, 'encounter', locker);
    queueCDS.init(mongo, 'queue', locker);

    linkCollection = mongo.collections.link;
    encounterCollection = mongo.collections.encounter;
    queueCollection = mongo.collections.queue;

    linkCollection.ensureIndex({"link":1},{unique:true},function() {});
    linkCollection.ensureIndex({"id":1},{unique:true},function() {});

    encounterCollection.ensureIndex({"link":1},{background:true},function() {});
    encounterCollection.ensureIndex({"orig":1},{background:true},function() {});
    encounterCollection.ensureIndex({"_hash":1},{background:true},function() {});

    queueCollection.ensureIndex({"idr":1},{unique:true,background:true},function() {});
}

exports.clear = function(callback) {
  linkCDS.clear(function() {
    encounterCDS.clear(function() {
      queueCDS.clear(callback);
    });
  });
}

exports.getTotalCount = linkCDS.getTotalCount;
exports.getTotalEncounters = encounterCDS.getTotalCount;
exports.getSince = linkCDS.getSince;
exports.getLastObjectID = linkCDS.getLastObjectID;
exports.get = linkCDS.get;

exports.enqueue = function(obj, callback) {
  queueCollection.findAndModify({"idr":obj.idr}, [], {$set:obj}, {safe:true, upsert:true, new: true}, callback);
}

exports.dequeue = function(obj, callback) {
  queueCollection.remove({"idr":obj.idr}, callback);
}

exports.fetchQueue = function(callback) {
  queueCollection.find().sort({at: -1}).toArray(callback);
}

// handy to check all the original urls we've seen to know if we already have a link expanded/done
exports.checkUrl = function(origUrl, callback) {
    encounterCollection.find({orig:origUrl}, {limit:1}, function(err, cursor){
        if(err) return callback();
        cursor.nextObject(function(err, item){
            if(err || !item || !item.link) return callback();
            callback(item.link);
        });
    });
}

// either gets a single link arg:{url:...} or can paginate all arg:{start:10,limit:10}
var workaround = false;
exports.getLinks = function(arg, cbEach, cbDone) {
    if(workaround == false)
    { // this is the strangest thing, temp workaround till https://github.com/christkv/node-mongodb-native/issues/447
        workaround = true;
        linkCDS.findWrap({},{limit:1},function(){},function(){
            exports.getLinks(arg, cbEach, cbDone);
        });
        return;
    }
    var f = (arg.link)?{link:arg.link}:{};
    delete arg.id;
    linkCDS.findWrap(f,arg,cbEach,cbDone);
}

exports.getFullLink = function(id, cbDone) {
    var link = null;
    exports.getLinks({link:id}, function(l) { link = l; }, function() { cbDone(link); });
}

// either gets a single encounter arg:{id:...,network:...,link:...} or multiple from just a link arg:{link:...} and can paginate all arg:{start:10,limit:10}
exports.getEncounters = function(arg, cbEach, cbDone) {
    var f = (arg.link)?{link:arg.link}:{}; // link search
    if(arg.id) f = {id:arg.network+':'+arg.id+':'+arg.link}; // individual encounter search
    delete arg.id;
    delete arg.network;
    delete arg.link;
    encounterCDS.findWrap(f,arg,cbEach,cbDone)
}


// insert new (fully normalized) link, ignore or replace if it already exists?
// {link:"http://foo.com/bar", title:"Foo", text:"Foo bar is delicious.", favicon:"http://foo.com/favicon.ico"}
exports.addLink = function(link, callback) {
//    logger.verbose("addLink: "+JSON.stringify(link));
    linkCollection.findAndModify({"link":link.link}, [], {$set:link}, {safe:true, upsert:true, new: true}, callback);
    linkCDS.updateState();
}

exports.updateLinkAt = function(link, at, callback) {
    linkCollection.findAndModify({"link":link}, [], {$set:{"at":at}}, {safe:true, upsert:false, new:true}, callback);
}

exports.updateLinkEmbed = function(link, embed, callback) {
    linkCollection.findAndModify({"link":link}, [], {$set:{"embed":embed}}, {safe:true, upsert:false, new:false}, callback);
}

// insert new encounter, replace any existing
// {id:"123456632451234", network:"foo", at:"123412341234", from:"Me", fromID:"1234", orig:"http://bit.ly/foo", link:"http://foo.com/bar", via:{...}}
exports.addEncounter = function(encounter, callback) {
    // create unique id as encounter.network+':'+encounter.id+':'+link, sha1 these or something?
//    logger.verbose("addEncounter: "+JSON.stringify(encounter));
    var _hash = encounter.network + ":" + encounter.id + ":" + encounter.link;
    encounter["_hash"] = _hash;
    var options = {safe:true, upsert:true, new: true};
    encounterCollection.findAndModify({"_hash":_hash}, [], {$set:encounter}, options, function(err, doc) {
        if (!doc) return callback(err);
        delete doc["_hash"];
        callback(err, doc);
    });
}

