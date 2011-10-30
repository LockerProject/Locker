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
var placeCollection, locker, db;

exports.init = function(pCollection, l, mongo) {
    placeCollection = pCollection;
    locker = l;
    db = mongo.dbClient;
}

exports.clear = function(callback) {
    placeCollection.drop(callback);
}

exports.getTotalPlaces = function(callback) {
    placeCollection.count(callback);
}

exports.get = function(id, callback) {
    placeCollection.findOne({_id: new db.bson_serializer.ObjectID(id)}, callback);
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
    var fields = {};
    if(arg.fields)
    {
        fields = arg.fields;
        delete arg.fields;
    }
    if(arg.me) arg.me = (arg.me === 'true')?true:false;
    var cursor = placeCollection.find(arg, fields);
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
        var eventObj = {source: "places", type: "place", data:doc};
        locker.event("place", eventObj);
        callback(err, doc);
    });
}


