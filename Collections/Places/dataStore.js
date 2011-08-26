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
var placeCollection;

exports.init = function(pCollection) {
    placeCollection = pCollection;
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
    var sort, limit;
    if(arg.sort)
    {
        sort=arg.sort;
        delete arg.sort;
    }
    if(arg.limit)
    {
        limit=arg.limit;
        delete arg.limit;
    }
    // how to handle start=x?
    var cursor = placeCollection.find(arg);
    if (sort) cursor.sort(sort);
    if (limit) cursor.limit(limit);
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
    logger.debug("addPlace: "+JSON.stringify(place));
    var _hash = hashPlace(place);
    place["_hash"] = _hash;
    var options = {safe:true, upsert:true, new: true};
    placeCollection.findAndModify({"_hash":_hash}, [['_id','asc']], {$set:place}, options, function(err, doc) {
        delete doc["_hash"];
        callback(err, doc);
    });
}

    
