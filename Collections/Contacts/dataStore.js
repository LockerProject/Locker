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

exports.addTwitterData = function(relationship, twitterData, callback) {
    var twID  = twitterData.data.id;
    var cleanedName = cleanName(twitterData.data.name);
    var query = {'accounts.twitter.data.id':twID};
    var set = {};
    var baseObj = {data:twitterData.data, lastUpdated:twitterData.timeStamp || new Date().getTime()};
    baseObj[relationship] = true;
    set['accounts.twitter.$'] = baseObj;
    collection.update(query, {$set: set, $addToSet:{'_matching.cleanedNames':cleanedName}},
                        {safe:true}, function(err, doc) {
        if(!doc) {
            //match otherwise
            var or = [{'_matching.cleanedNames':cleanedName}];
            collection.update({$or:or}, {$push:{'accounts.twitter':baseObj}, $addToSet:{'_matching.cleanedNames':cleanedName}}, 
                        {safe:true, upsert:true}, callback);
        } else {
            callback(err, doc);
        }
    });
}

exports.addFoursquareData = function(foursquareData, callback) {
    var foursquareID = foursquareData.data.id;
    var cleanedName = cleanName(foursquareData.data.name);
    var query = {'accounts.foursquare.data.id':foursquareID};
    var set = {};
    var baseObj = {data:foursquareData.data, lastUpdated:foursquareData.timeStamp || new Date().getTime()};
    set['accounts.foursquare.$'] = baseObj;
    collection.update(query, {$set: set, $addToSet:{'_matching.cleanedNames':cleanedName}},
                             {safe: true}, function(err, doc) {
        if (!doc) {
            var or = [{'_matching.cleanedNames':cleanedName},{'accounts.twitter.data.screen_name':foursquareData.data.contact.twitter}];
            collection.update({$or:or}, {$push:{'accounts.foursquare':baseObj}, $addToSet:{'_matching.cleanedNames':cleanedName}},
                              {safe: true, upsert: true}, callback);
        } else {
            callback(err, doc);
        }
    });
}

// {
//    "id": "220439",
//    "name": "Bret Taylor",
//    "first_name": "Bret",
//    "last_name": "Taylor",
//    "link": "https://www.facebook.com/btaylor",
//    "username": "btaylor",
//    "gender": "male",
//    "locale": "en_US"
// }
exports.addFacebookData = function(facebookData, callback) {
    var fbID  = facebookData.data.id;
    var cleanedName = cleanName(facebookData.data.name);
    var query = {'accounts.facebook.data.id':fbID};
    var set = {};
    var baseObj = {data:facebookData.data, lastUpdated:facebookData.timeStamp || new Date().getTime()};
    set['accounts.facebook.$'] = baseObj;
    collection.update(query, {$set: set, $addToSet:{'_matching.cleanedNames':cleanedName}},
                        {safe:true}, function(err, doc) {
        if(!doc) {
            //match otherwise
            var or = [{'_matching.cleanedNames':cleanedName}];
            collection.update({$or:or}, {$push:{'accounts.facebook':baseObj}, $addToSet:{'_matching.cleanedNames':cleanedName}}, 
                        {safe:true, upsert:true}, callback);
        } else {
            callback(err, doc);
        }
    });
}


function cleanName(name) {
    return name;
}