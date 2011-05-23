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


function cleanName(name) {
    return name;
}