/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var logger = require(__dirname + "/../../Common/node/logger").logger;
var fs = require('fs');
var lutil = require('lutil');

// in the future we'll probably need a visitCollection too
var linkCollection, encounterCollection, queueCollection;

exports.init = function(lCollection, eCollection, qCollection) {
    linkCollection = lCollection;
    linkCollection.ensureIndex({"link":1},{unique:true},function() {});
    encounterCollection = eCollection;
    queueCollection = qCollection;
}

exports.clear = function(callback) {
    linkCollection.drop(function() {
        encounterCollection.drop(function() {
            queueCollection.drop(callback);
        });
    });
}

exports.getTotalLinks = function(callback) {
    linkCollection.count(callback);
}
exports.getTotalEncounters = function(callback) {
    encounterCollection.count(callback);
}

exports.enqueue = function(obj, callback) {
    queueCollection.findAndModify({"text":obj.text}, [['_id','asc']], {$set:{'obj' : obj, 'at' : Date.now()}}, {safe:true, upsert:true, new: true}, callback);
}

exports.dequeue = function(obj, callback) {
    queueCollection.remove({"text":obj.text}, callback);
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
exports.getLinks = function(arg, cbEach, cbDone) {
    var f = (arg.link)?{link:arg.link}:{};
    delete arg.id;
    findWrap(f,arg,linkCollection,cbEach,cbDone);
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
    findWrap(f,arg,encounterCollection,cbEach,cbDone)
}

function findWrap(a,b,c,cbEach,cbDone){
    var cursor = c.find(a);
    if (b.sort) cursor.sort(b.sort);
    if (b.limit) cursor.limit(b.limit);
    cursor.each(function(err, item) {
        if (item != null) {
            cbEach(item);
        } else {
            cbDone();
        }
    });
}

var writeTimer = false;
function updateState()
{
    if (writeTimer) {
        clearTimeout(writeTimer);
    }
    writeTimer = setTimeout(function() {
        try {
            lutil.atomicWriteFileSync("state.json", JSON.stringify({updated:new Date().getTime()}));
        } catch (E) {}
    }, 5000);    
}

// insert new (fully normalized) link, ignore or replace if it already exists?
// {link:"http://foo.com/bar", title:"Foo", text:"Foo bar is delicious.", favicon:"http://foo.com/favicon.ico"}
exports.addLink = function(link, callback) {
//    logger.debug("addLink: "+JSON.stringify(link));
    linkCollection.findAndModify({"link":link.link}, [['_id','asc']], {$set:link}, {safe:true, upsert:true, new: true}, callback);
    updateState();
}

exports.updateLinkAt = function(link, at, callback) {
    linkCollection.findAndModify({"link":link}, [['_id', 'asc']], {$set:{"at":at}}, {safe:true, upser:false, new:false}, callback);
}

// insert new encounter, replace any existing
// {id:"123456632451234", network:"foo", at:"123412341234", from:"Me", fromID:"1234", orig:"http://bit.ly/foo", link:"http://foo.com/bar", via:{...}}
exports.addEncounter = function(encounter, callback) {
    // create unique id as encounter.network+':'+encounter.id+':'+link, sha1 these or something?
//    logger.debug("addEncounter: "+JSON.stringify(encounter));
    var _hash = encounter.network + ":" + encounter.id + ":" + encounter.link;
    encounter["_hash"] = _hash;
    var options = {safe:true, upsert:true, new: true};
    encounterCollection.findAndModify({"_hash":_hash}, [['_id','asc']], {$set:encounter}, options, function(err, doc) {
        if (!doc) return callback(err);
        delete doc["_hash"];
        callback(err, doc);
    });
}

