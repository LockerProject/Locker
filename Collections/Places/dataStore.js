/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var logger = require(__dirname + "/../../Common/node/logger").logger;

// in the future we'll probably need a visitCollection too
var placeCollection, locker;

exports.init = function(pCollection, l) {
    placeCollection = pCollection;
    locker = l;
}

exports.clear = function(callback) {
    placeCollection.drop(callback);
}

exports.getTotalPlaces = function(callback) {
    placeCollection.count(callback);
}

function hashPlace(place)
{
    return place.lat + ":" + place.lng + ":" + place.at;
}

// either gets a single link arg:{url:...} or can paginate all arg:{start:10,limit:10}
exports.getPlaces = function(arg, cbEach, cbDone) {
    var f = (arg.id)?{link:arg.link}:{};
    delete arg.id;
    var sort, limit, offset;
    if(arg.sort)
    {
        sort=arg.sort;
        delete arg.sort;
    }
    if(arg.limit)
    {
        limit=parseInt(arg.limit);
        delete arg.limit;
    }
    if(arg.offset)
    {
        offset=parseInt(arg.offset);
        delete arg.offset;
    }
    if(arg.me) arg.me = (arg.me === 'true')?true:false;
    var cursor = placeCollection.find(arg);
    if (sort) cursor.sort(sort);
    if (limit) cursor.limit(limit);
    if (offset) cursor.skip(offset);
    cursor.each(function(err, item) {
        if (item != null) {
            cbEach(item);
        } else {
            cbDone();
        }
    });
}

// insert new place, replace any existing based on hash
exports.addPlace = function(place, callback) {
//    logger.debug("addPlace: "+JSON.stringify(place));
    var _hash = hashPlace(place);
    place["_hash"] = _hash;
    var options = {safe:true, upsert:true, new: true};
    placeCollection.findAndModify({"_hash":_hash}, [['_id','asc']], {$set:place}, options, function(err, doc) {
        delete doc["_hash"];
        var eventObj = {source: "photos", type: "photo", data:doc};
        locker.event("photo", eventObj);
        callback(err, doc);
    });
}


