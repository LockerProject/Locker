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

exports.addData = function(type, endpoint, data, callback) {
    if (type == 'facebook') {
        exports.addFacebookData(data, callback);
    } else if (type == 'twitter') {
        exports.addTwitterData(endpoint, data, callback);
    } else if (type == 'foursquare') {
        exports.addFoursquareData(data, callback);
    } else if (type == 'google') {
        exports.addGoogleContactsData(data, callback);
    }
}

exports.addTwitterData = function(relationship, twitterData, callback) {
    relationship = relationship.substring(0, relationship.length - 1);
    var data = twitterData.data;
    var twID  = data.id;
    var cleanedName = cleanName(data.name);
    var query = {'accounts.twitter.data.id':twID};
    var set = {};
    var baseObj = {data:data, lastUpdated:twitterData.timeStamp || new Date().getTime()};
    baseObj[relationship] = true;
    set['accounts.twitter.$'] = baseObj;
    if(data.name)
        set.name = data.name;
    collection.update(query, {$set: set, $addToSet:{'_matching.cleanedNames':cleanedName}},
                        {safe:true}, function(err, doc) {
        if(!doc) {
            //match otherwise
            var or = [{'_matching.cleanedNames':cleanedName}, 
                      {'accounts.foursquare.data.contact.twitter':twitterData.data.screen_name}];
            collection.update({$or:or}, {$push:{'accounts.twitter':baseObj}, 
                                         $addToSet:{'_matching.cleanedNames':cleanedName},
                                         $set:{'name':data.name}}, 
                        {safe:true, upsert:true}, callback);
        } else {
            callback(err, doc);
        }
    });
}

exports.addFoursquareData = function(foursquareData, callback) {
    var data = foursquareData.data;
    var foursquareID = data.id;
    var name = data.firstName + ' ' + data.lastName;
    var cleanedName = cleanName(name);
    var query = {'accounts.foursquare.data.id':foursquareID};
    var set = {};
    var baseObj = {data:data, lastUpdated:foursquareData.timeStamp || new Date().getTime()};
    set['accounts.foursquare.$'] = baseObj;
    if(name)
        set.name = name;
    if(data.gender)
        set.gender = data.gender;
    collection.update(query, {$set: set, $addToSet:{'_matching.cleanedNames':cleanedName,
                                                    'photos':data.photo}},
                             {safe: true}, function(err, doc) {
        if (!doc) {
            var or = [{'_matching.cleanedNames':cleanedName}];
            if(data.contact.twitter)
                or.push({'accounts.twitter.data.screen_name':data.contact.twitter});
            if(data.contact.facebook)
                or.push({'accounts.facebook.data.id':data.contact.facebook});
            var set = {};
            collection.update({$or:or}, {$push:{'accounts.foursquare':baseObj}, 
                                         $addToSet:{'_matching.cleanedNames':cleanedName,
                                                    'photos':data.photo},
                                         $set:{'name':data.name, 'gender':data.gender}},
                              {safe: true, upsert: true}, callback);
        } else {
            callback(err, doc);
        }
    });
}

exports.addFacebookData = function(facebookData, callback) {
    var data = facebookData.data;
    var fbID  = data.id;
    var cleanedName = cleanName(data.name);
    var query = {'accounts.facebook.data.id':fbID};
    var set = {};
    var baseObj = {data:data, lastUpdated:facebookData.timeStamp || new Date().getTime()};
    set['accounts.facebook.$'] = baseObj;
    if(data.name)
        set.name = data.name;
    collection.update(query, {$set: set, $addToSet:{'_matching.cleanedNames':cleanedName}},
                        {safe:true}, function(err, doc) {
        if(!doc) {
            //match otherwise
            var or = [{'_matching.cleanedNames':cleanedName}, 
                      {'accounts.foursquare.data.contact.facebook':fbID}];
            collection.update({$or:or}, {$push:{'accounts.facebook':baseObj}, 
                                         $addToSet:{'_matching.cleanedNames':cleanedName},
                                         $set:{'name':data.name}}, 
                        {safe:true, upsert:true}, callback);
        } else {
            callback(err, doc);
        }
    });
}

exports.addGoogleContactsData = function(googleContactsData, callback) {
    var data = googleContactsData.data;
    var gcID  = data.id;
    var cleanedName = cleanName(data.name);
    var query = {'accounts.googleContacts.data.id':gcID};
    var set = {};
    var baseObj = {data:googleContactsData.data, lastUpdated:data.lastUpdated || new Date().getTime()};
    set['accounts.googleContacts.$'] = baseObj;
    if(data.name)
        set.name = data.name;
    collection.update(query, {$set: set, $addToSet:{'_matching.cleanedNames':cleanedName}},
                       {safe:true}, function(err, doc) {
        if(!doc) {
            //match otherwise
            var or = [{'_matching.cleanedNames':cleanedName}];
            collection.update({$or:or}, {$push:{'accounts.googleContacts':baseObj}, 
                                         $addToSet:{'_matching.cleanedNames':cleanedName},
                                         $set:{'name':data.name}}, 
                        {safe:true, upsert:true}, callback);
        } else {
            callback(err, doc);
        }
    });
}

exports.clear = function(callback) {
    collection.drop(callback);
}

function cleanName(name) {
    if(!name || typeof name != 'string')
        return name;
    return name.toLowerCase();
}
