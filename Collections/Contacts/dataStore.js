/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var collection;
var lconfig = require('../../Common/node/lconfig');

exports.init = function(mongoCollection) {
    collection = mongoCollection;
}

exports.getTotalCount = function(callback) {
    collection.count(callback);
}
exports.getAll = function(callback) {
    collection.find({}, callback);
}

exports.addEvent = function(eventBody, callback) {
    var target;
        
    switch (eventBody.type) {
        case 'contact/foursquare':
            target = exports.addFoursquareData;
            break;
        case 'contact/facebook':
            target = exports.addFacebookData;
            break;
        case 'contact/twitter':
            target = exports.addTwitterData;
            break;
        case 'contact/github':
            if(eventBody.obj.source !== 'watcher')
                target = exports.addGithubData;
            break;
        case 'contact/google':
            target = exports.addGoogleContactsData;
            break;
    }
    if(!target) {
        callback('event received could not be processed by the contacts collection');
        return;
    }
    switch (eventBody.obj.type) {
        // what do we want to do for a delete event?
        //
        case 'delete':
            return callback();
            break;
        default:
            target(eventBody.obj, function(err, doc) {
                // what event should this be?
                // also, should the source be what initiated the change, or just contacts?  putting contacts for now.
                //
                // var eventObj = {source: req.body.obj.via, type:req.body.obj.type, data:doc};
                var eventObj = {source: "contacts", type:eventBody.obj.type, data:doc};
                return callback(undefined, eventObj);
            });
            break;
    }
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
    } else if (type == 'github') {
        exports.addGithubData(endpoint, data, callback);
    }
}

exports.addTwitterData = function(relationship, twitterData, callback) {
    if (typeof twitterData === 'function') {
        callback = twitterData;
        twitterData = relationship;
        relationship = twitterData.source;
    } else if (relationship === 'followers') {
        relationship = relationship.substring(0, relationship.length - 1);
    }
    var data = twitterData.data;
    var twID  = data.id;
    var cleanedName = cleanName(data.name);
    var query = {'accounts.twitter.data.id':twID};
    var set = {};
    var baseObj = {data:data, lastUpdated:twitterData.timeStamp || new Date().getTime()};
    baseObj[relationship] = true;
    set['accounts.twitter.$'] = baseObj;
    //name
    if(data.name)
        set.name = data.name;
    var addToSet = {'_matching.cleanedNames':cleanedName};
    //photos
    if(data.profile_image_url)
        addToSet.photos = data.profile_image_url;
    //addresses
    if(data.location)
        addToSet.addresses = {type:'location', value:data.location};
    //nicknames
    if(data.location)
        addToSet.nicknames = data.screen_name;
    collection.findAndModify(query, [['_id','asc']], {$set: set, $addToSet:addToSet},
                        {safe:true, new: true}, function(err, doc) {
        if(!doc) {
            //match otherwise
            var or = [{'accounts.foursquare.data.contact.twitter':twitterData.data.screen_name}];
            if(cleanedName) 
                or.push({'_matching.cleanedNames':cleanedName});
            var set = {};
            if(data.name)
                set.name = data.name;
            collection.findAndModify({$or:or}, [['_id','asc']], {$push:{'accounts.twitter':baseObj}, 
                                         $addToSet:addToSet,
                                         $set:set}, 
                        {safe:true, upsert:true, new: true}, callback);
        } else {
            callback(err, doc);
        }
    });
}

exports.addGithubData = function(relationship, gitHubData, callback) {
    if (typeof gitHubData === 'function') {
        callback = gitHubData;
        gitHubData = relationship;
        relationship = gitHubData.source;
    } else {
        relationship = relationship.substring(0, relationship.length - 1);
    }
    var data = gitHubData.data;
    var cleanedName = cleanName(data.name);
    var query = {'accounts.github.data.id':data.id};
    var set = {};
    var baseObj = {data:data, lastUpdated:new Date().getTime()};
    baseObj[relationship] = true;
    set['accounts.github.$'] = baseObj;
    //name
    if(data.name)
        set.name = data.name;
    var addToSet = {};
    if(cleanedName)
        addToSet['_matching.cleanedNames'] = cleanedName;
    //nicknames
    if(data.login)
        addToSet.nicknames = data.login;
    //email
    if(data.email)
        addToSet.emails = {value:data.email};
    if(data.gravatar_id)
        addToSet.photos = 'https://secure.gravatar.com/avatar/' + data.gravatar_id;
    collection.findAndModify(query, [['_id','asc']], {$set: set, $addToSet:addToSet},
                        {safe:true, new: true}, function(err, doc) {
        if(!doc) {
            //match otherwise, first entry is just to ensure we never match on nothing
            var or = [{'accounts.github.data.id':data.id}];
            if(cleanedName) 
                or.push({'_matching.cleanedNames':cleanedName});
            if (data.email)
                or.push({'emails.value' : data.email});
            var set = {};
            if(data.name)
                set.name = data.name;
            collection.findAndModify({$or:or}, [['_id','asc']], {$push:{'accounts.github':baseObj}, 
                                         $addToSet:addToSet,
                                         $set:set}, 
                        {safe:true, upsert:true, new: true}, callback);
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
    //name
    if(name)
        set.name = name;
    //gender
    if(data.gender)
        set.gender = data.gender;
    var addToSet = {};
    if(cleanedName)
        addToSet['_matching.cleanedNames'] = cleanedName;
    //photos
    if(data.photo)
        addToSet.photos = data.photo;
    //phoneNumbers
    if(data.contact.phone)
        addToSet.phoneNumbers = {value:data.contact.phone, type:'mobile'};
    //email
    if(data.contact.email)
        addToSet.emails = {value:data.contact.email};
    //addresses
    if(data.homeCity)
        addToSet.addresses = {type:'location', value:data.homeCity};
    collection.findAndModify(query, [['_id','asc']], {$set: set, $addToSet:addToSet},
                             {safe: true, new: true}, function(err, doc) {
        if (!doc) {
            var or = [{'accounts.foursquare.data.id':foursquareID}];
            if(cleanedName)
                or.push({'_matching.cleanedNames':cleanedName});
            if(data.contact.twitter)
                or.push({'accounts.twitter.data.screen_name':data.contact.twitter});
            if(data.contact.facebook)
                or.push({'accounts.facebook.data.id':data.contact.facebook});
            var set = {};
            if(name)
                set.name = name;
            if(data.gender)
                set.gender = data.gender;
            collection.findAndModify({$or:or}, [['_id','asc']], {$push:{'accounts.foursquare':baseObj}, 
                                         $addToSet:addToSet,
                                         $set:set},
                              {safe: true, upsert: true, new: true}, callback);
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
    //name
    if(data.name)
        set.name = data.name;
    
    var addToSet = {};
    if(cleanedName)
        addToSet['_matching.cleanedNames'] = cleanedName;
    //photos
    if(data.id)
        addToSet.photos = 'https://graph.facebook.com/' + data.id + '/picture';
    collection.findAndModify(query, [['_id','asc']], {$set: set, $addToSet:addToSet},
                        {safe:true, new: true}, function(err, doc) {
        if(!doc) {
            //match otherwise
            var or = [{'accounts.foursquare.data.contact.facebook':fbID}];
            if(cleanedName)
                or.push({'_matching.cleanedNames':cleanedName});
                
            var set = {};
            if(data.name)
                set.name = data.name;
            collection.findAndModify({$or:or}, [['_id','asc']], {$push:{'accounts.facebook':baseObj}, 
                                         $addToSet:addToSet,
                                         $set:set}, 
                        {safe:true, upsert:true, new: true}, callback);
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
    
    var addToSet = {};
    if(cleanedName)
        addToSet['_matching.cleanedNames'] = cleanedName;
    //photos
    if(data.id && data.photo)
        addToSet.photos = '/' + lconfig.me + '/gcontacts/photo/' + data.id;
    //addresses
    if(data.address) {
        var addresses = [];
        for(var i in data.address) {
            if(!(data.address[i] && data.address[i].value))
                continue;
            addresses.push(data.address[i]);
        }
        addToSet.addresses = {$each:addresses};
    }
    //phones
    if(data.phone) {
        var phones = [];
        for(var i in data.phone) {
            if(!(data.phone[i] && data.phone[i].value))
                continue;
            phones.push(data.phone[i]);
        }
        addToSet.phoneNumbers = {$each:phones};
    }
    var emails = [];
    //emails
    if(data.email) {
        for(var i in data.email) {
            if(!(data.email[i] && data.email[i].value))
                continue;
            data.email[i].value = data.email[i].value.toLowerCase();
            emails.push(data.email[i]);
        }
        addToSet.emails = {$each:emails};
    }
    collection.findAndModify(query, [['_id','asc']], {$set: set, $addToSet:addToSet},
                       {safe:true, new: true}, function(err, doc) {
        if(!doc) {
            //match otherwise
            var or = [{'accounts.googleContacts.data.id':gcID}];
            if(cleanedName)
                or.push({'_matching.cleanedNames':cleanedName});
            if (emails) {
                for (var i in emails) {
                    or.push({'emails.value' : emails[i].value});
                }
            }
            var set = {};
            if(data.name)
                set.name = data.name;
            collection.findAndModify({$or:or}, [['_id','asc']], {$push:{'accounts.googleContacts':baseObj}, 
                                         $addToSet:addToSet,
                                         $set:set}, 
                        {safe:true, upsert:true, new: true}, callback);
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
