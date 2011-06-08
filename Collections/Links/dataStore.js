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

exports.addData = function(svcID, type, endpoint, data, callback) {
    if (type === 'facebook') {
        exports.addFacebookLink(svcID, data, callback);
    } else if (type === 'twitter') {
        exports.addTwitterLink(svcID, data, callback);
    }
}

exports.addTwitterLink = function(svcID, twitterData, callback) {
    exports.addLink(svcID, twitterData.data, 
            twitterData.data.entities.urls[0].expanded_url || twitterData.data.entities.urls[0].url,
            callback);
}

exports.addFacebookLink = function(svcID, facebookData, callback) {
    exports.addLink(svcID, facebookData.data, facebookData.data.link, callback);
}

exports.addLink = function(svcID, data, url, callback) {
    // console.log('adding link ', url, 'from', svcID);
    collection.findAndModify({'url':url}, [['_id','asc']], 
                             {$set:{'url':url}, 
                             //TODO: this could get seriously expensive!!!
                              $addToSet:{sourceObjects:{'svcID':svcID, object:data}}}, 
                             {safe:true, upsert:true}, callback);
}

exports.clear = function(callback) {
    collection.drop(callback);
}

function cleanName(name) {
    if(!name || typeof name != 'string')
        return name;
    return name.toLowerCase();
}
