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
//profile_image_url
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
    var addToSet = {'_matching.cleanedNames':cleanedName};
    if(data.profile_image_url)
        addToSet.photos = data.profile_image_url;
    if(data.location)
        addToSet.address = {type:'location', value:data.location};
    collection.update(query, {$set: set, $addToSet:addToSet},
                        {safe:true}, function(err, doc) {
        if(!doc) {
            //match otherwise
            var or = [{'_matching.cleanedNames':cleanedName}, 
                      {'accounts.foursquare.data.contact.twitter':twitterData.data.screen_name}];
            collection.update({$or:or}, {$push:{'accounts.twitter':baseObj}, 
                                         $addToSet:addToSet,
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
    var addToSet = {'_matching.cleanedNames':cleanedName};
    if(data.photo)
        addToSet.photos = data.photo;
    if(data.contact.phone)
        addToSet.phone = {value:data.contact.phone, type:'mobile'};
    if(data.contact.email)
        addToSet.email = {value:data.contact.email};
    if(data.homeCity)
        addToSet.address = {type:'location', value:data.homeCity};
    collection.update(query, {$set: set, $addToSet:addToSet},
                             {safe: true}, function(err, doc) {
        if (!doc) {
            var or = [{'_matching.cleanedNames':cleanedName}];
            if(data.contact.twitter)
                or.push({'accounts.twitter.data.screen_name':data.contact.twitter});
            if(data.contact.facebook)
                or.push({'accounts.facebook.data.id':data.contact.facebook});
            var set = {};
            collection.update({$or:or}, {$push:{'accounts.foursquare':baseObj}, 
                                         $addToSet:addToSet,
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
    
    var addToSet = {'_matching.cleanedNames':cleanedName};
    if(data.address) {
        var addresses = [];
        for(var i in data.address) {
            if(!(data.address[i] && data.address[i].value))
                continue;
            addresses.push(data.address[i]);
        }
        addToSet.address = {$each:addresses};
    }
    if(data.phone) {
        var phones = [];
        for(var i in data.phone) {
            if(!(data.phone[i] && data.phone[i].value))
                continue;
            phones.push(data.phone[i]);
        }
        addToSet.phone = {$each:phones};
    }
    if(data.email) {
        var emails = [];
        for(var i in data.email) {
            if(!(data.email[i] && data.email[i].value))
                continue;
            data.email[i].value = data.email[i].value.toLowerCase();
            emails.push(data.email[i]);
        }
        addToSet.email = {$each:emails};
    }
    collection.update(query, {$set: set, $addToSet:addToSet},
                       {safe:true}, function(err, doc) {
        if(!doc) {
            //match otherwise
            var or = [{'_matching.cleanedNames':cleanedName}];
            collection.update({$or:or}, {$push:{'accounts.googleContacts':baseObj}, 
                                         $addToSet:addToSet,
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
