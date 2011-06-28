/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var collection;

exports.init = function(mongoCollection) {
    collection = mongoCollection;
}

exports.getTotalCount = function(callback) {
    collection.count(callback);
}
exports.getAll = function(callback) {
    collection.find({}, callback);
}

exports.addEvent = function(data, callback) {
    var type = data._via[0];
    if (type.indexOf('facebook') !== -1) {
        exports.addLink("facebook", data.obj.data, data.obj.data.url, callback);
    } else if (type.indexOf('twitter') !== -1) {
        exports.addLink("twitter", data.obj.status, data.obj.status.entities.urls[0].expanded_url || data.obj.status.entities.urls[0].url, callback);
    }
}

exports.addData = function(svcID, type, data, callback) {
    if (type === 'facebook') {
        exports.addLink(svcID, data.data, data.data.link, callback);
    } else if (type === 'twitter') {
        exports.addLink(svcID, data.data, 
                data.data.entities.urls[0].expanded_url || data.data.entities.urls[0].url,
                callback);
    }
}

exports.addLink = function(svcID, data, url, callback) {
    collection.findAndModify({'url':url}, [['_id','asc']], 
                             {$set:{'url':url}, 
                             //TODO: this could get seriously expensive!!!
                              $addToSet:{sourceObjects:{'svcID':svcID, object:data}}}, 
                             {safe:true, upsert:true, new: true}, callback);
}

exports.clear = function(callback) {
    collection.drop(callback);
}