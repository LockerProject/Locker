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

// in the future we'll probably need a visitCollection too
var itemCol, respCol;

exports.init = function(iCollection, rCollection) {
    itemCol = iCollection;
//    itemCol.ensureIndex({"item":1},{unique:true},function() {});
    respCol = rCollection;
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
    var hash = crypto.createHash('md5');
    for(var i in item.keys) hash.update(i);
    item.id = hash.digest('hex');
//    logger.debug("addItem: "+JSON.stringify(item));
    itemCol.findAndModify({"id":item.id}, [['_id','asc']], {$set:item}, {safe:true, upsert:true, new: true}, callback);
}
