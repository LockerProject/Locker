/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var logger = require(__dirname + "/../../Common/node/logger").logger;
var crypto = require("crypto");
var async = require('async');

// in the future we'll probably need a visitCollection too
var itemCol, respCol;

exports.init = function(iCollection, rCollection) {
    itemCol = iCollection;
    itemCol.ensureIndex({"id":1},{unique:true, background:true},function() {});
    respCol = rCollection;
    respCol.ensureIndex({"id":1},{unique:true, background:true},function() {});
    respCol.ensureIndex({"item":1},{background:true},function() {});
}

exports.clear = function(callback) {
    itemCol.drop(function(){respCol.drop(callback)});
}

exports.getTotalItems = function(callback) {
    itemCol.count(callback);
}
exports.getTotalResponses = function(callback) {
    respColl.count(callback);
}

exports.getItemByKey = function(key, callback) {
    var item;
    var kname = "keys."+key;
    var find = {};
    find[kname] = {$exists:true};
    findWrap(find,{limit:1},itemCol,function(i){item=i},function(err){callback(err,item)});
}

exports.getItem = function(id, callback) {
    var item;
    findWrap({id:id},{},itemCol,function(i){item=i},function(err){callback(err,item)});
}

// arg takes sort/limit/offset/find
exports.getResponses = function(arg, cbEach, cbDone) {
    var f = (arg.item)?{item:arg.item}:{};
    delete arg.item;
    findWrap(f,arg,respCol,cbEach,cbDone);
}

// arg takes sort/limit/offset/find
exports.getItems = function(arg, cbEach, cbDone) {
    var f = {};
    try {
        f = JSON.parse(arg.find); // optional, can bomb out
    }catch(E){}
    delete arg.find;
    findWrap(f,arg,itemCol,cbEach,cbDone);
}

function findWrap(a,b,c,cbEach,cbDone){
//    console.log("a(" + JSON.stringify(a) + ") b("+ JSON.stringify(b) + ")");
    var cursor = c.find(a);
    if (b.sort) cursor.sort(parseInt(b.sort));
    if (b.limit) cursor.limit(parseInt(b.limit));
    if (b.offset) cursor.skip(parseInt(b.offset));
    cursor.each(function(err, item) {
        if (item != null) {
            cbEach(item);
        } else {
            cbDone();
        }
    });
}


// insert new (fully normalized) item, generate the id here and now
exports.addItem = function(item, callback) {
    if(!item.id)
    { // first time an item comes in, make a unique id for it
        var hash = crypto.createHash('md5');
        for(var i in item.keys) hash.update(i);
        item.id = hash.digest('hex');
    }
//    logger.debug("addItem: "+JSON.stringify(item));
    var responses = item.responses;
    if(responses) responses.forEach(function(r){ r.item = item.id; });
    delete item.responses; // store responses in their own table
    delete item._id; // mongo is miss pissypants
    itemCol.findAndModify({"id":item.id}, [['_id','asc']], {$set:item}, {safe:true, upsert:true, new: true}, function(err, doc){
        if(err) return callback(err);
        if(responses) async.forEach(responses, exports.addResponse, function(err){callback(err, doc);}); // orig caller wants saved item back
    });
}

// responses are unique by their contents
exports.addResponse = function(response, callback) {
    var hash = crypto.createHash('md5');
    hash.update(JSON.stringify(response));
    response.id = hash.digest('hex');
    logger.debug("addResponse: "+JSON.stringify(response));
    delete response._id; // mongo is miss pissypants
    respCol.findAndModify({"id":response.id}, [['_id','asc']], {$set:response}, {safe:true, upsert:true, new: true}, callback);
}

// so, yeah, and that
exports.delItem = function(id, callback) {
    if(!id || id.length < 10) return callback("no or invalid id to del: "+id);
    itemCol.remove({id:id}, function(err){
        if(err) return callback(err);
        respCol.remove({item:id}, callback);
    });
}
