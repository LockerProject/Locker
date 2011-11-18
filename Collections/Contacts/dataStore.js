/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var collection;
var db;
var lconfig = require('../../Common/node/lconfig');
var fs = require('fs');
var lutil = require('lutil');
var locker = require('locker');
var lmongoutil = require("lmongoutil");
var url = require('url');

exports.init = function(mongoCollection, mongo) {
    collection = mongoCollection;
    db = mongo.dbClient;
}

exports.getTotalCount = function(callback) {
    collection.count(callback);
}
exports.getAll = function(fields, callback) {
    collection.find({}, fields, callback);
}

exports.get = function(id, callback) {
    collection.findOne({_id: new db.bson_serializer.ObjectID(id)}, callback);
}

exports.getSince = function(objId, cbEach, cbDone) {
    collection.find({"_id":{"$gt":lmongoutil.ObjectID(objId)}}, {sort:{_id:-1}}).each(function(err, item) {
        if (item != null)
            cbEach(item);
        else
            cbDone();
    });
}

exports.getLastObjectID = function(cbDone) {
    collection.find({}, {fields:{_id:1}, limit:1, sort:{_id:-1}}).nextObject(cbDone);
}

var writeTimer = false;
function updateState()
{
    if (writeTimer) {
        clearTimeout(writeTimer);
    }
    writeTimer = setTimeout(function() {
        try {
            lutil.atomicWriteFileSync("state.json", JSON.stringify({updated:new Date().getTime()}));
        } catch (E) {}
    }, 5000);
}

exports.addData = function(type, data, cb) {
    // shim to send events, post-add stuff
    var callback = function(err, doc)
    {
        if(doc && doc._id)
        {
            var idr = lutil.idrNew("contact", "contacts", eventObj._id);
            locker.ievent(idr, eventObj);
        }
        cb(err, doc);
    }
    if (type == 'facebook') {
        exports.addFacebookData(data, callback);
    } else if (type == 'twitter') {
        exports.addTwitterData(data, callback);
    } else if (type == 'foursquare') {
        exports.addFoursquareData(data, callback);
    } else if (type == 'gcontacts') {
        exports.addGoogleContactsData(data, callback);
    } else if (type == 'flickr') {
        exports.addFlickrData(data, callback);
    } else if (type == 'instagram') {
        exports.addInstagramData(data, callback);
    } else if (type == 'github') {
        exports.addGithubData(data, callback);
    }
}

exports.addTwitterData = function(data, callback) {
    var twID  = data.id;
    var cleanedName = cleanName(data.name);
    var query = {'accounts.twitter.data.id':twID};
    var set = {};
    var baseObj = {data:data, lastUpdated:new Date().getTime()};
    set['accounts.twitter.$'] = baseObj;
    //name
    setName(set, data.name);
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
            var or = [{'accounts.foursquare.data.contact.twitter':data.screen_name}];
            if(cleanedName)
                or.push({'_matching.cleanedNames':cleanedName});
            var set = {};
            setName(set, data.name);
            collection.findAndModify({$or:or}, [['_id','asc']], {$push:{'accounts.twitter':baseObj},
                                         $addToSet:addToSet,
                                         $set:set},
                        {safe:true, upsert:true, new: true}, callback);
        } else {
            callback(err, doc);
        }
    });
}

exports.addGithubData = function(data, callback) {
    var cleanedName = cleanName(data.name);
    var query = {'accounts.github.data.id':data.id};
    var set = {};
    var baseObj = {data:data, lastUpdated:new Date().getTime()};
    set['accounts.github.$'] = baseObj;
    //name
    setName(set, data.name);
    var addToSet = {};
    if(cleanedName)
        addToSet['_matching.cleanedNames'] = cleanedName;
    //nicknames
    if(data.login)
        addToSet.nicknames = data.login;
    //email
    if(data.email)
    {
        addToSet.emails = {value:data.email};
        set.emailsort = data.email;
    }
    if(data.gravatar_id)
        addToSet.photos = 'https://secure.gravatar.com/avatar/' + data.gravatar_id;
    collection.findAndModify(query, [['_id','asc']], {$set: set, $addToSet:addToSet},
                        {safe:true, new: true}, function(err, doc) {
        if(!doc) {
            //match otherwise, first entry is just to ensure we never match on nothing
            var or = [{'accounts.github.data.id':data.id}];
            if(cleanedName)
                or.push({'_matching.cleanedNames':cleanedName});
            var set = {};
            if (data.email)
            {
                or.push({'emails.value' : data.email});
                set.emailsort = data.email;
            }
            setName(set, data.name);
            collection.findAndModify({$or:or}, [['_id','asc']], {$push:{'accounts.github':baseObj},
                                         $addToSet:addToSet,
                                         $set:set},
                        {safe:true, upsert:true, new: true}, callback);
        } else {
            callback(err, doc);
        }
    });
}

exports.addFoursquareData = function(data, callback) {
    var foursquareID = data.id;
    var name = data.firstName;
    if(data.lastName) name += ' ' + data.lastName;
    var cleanedName = cleanName(name);
    var query = {'accounts.foursquare.data.id':foursquareID};
    var set = {};
    var baseObj = {data:data, lastUpdated:new Date().getTime()};
    set['accounts.foursquare.$'] = baseObj;
    //name
    setName(set, name);
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
    {
        addToSet.emails = {value:data.contact.email};
        set.emailsort = data.contact.email;
    }
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
            if (data.contact.email)
            {
                or.push({'emails.value' : data.contact.email});
                set.emailsort = data.contact.email;
            }
            setName(set, name);
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

exports.addFacebookData = function(data, callback) {
    var fbID  = data.id;
    var cleanedName = cleanName(data.name);
    var query = {'accounts.facebook.data.id':fbID};
    var set = {};
    var baseObj = {data:data, lastUpdated:new Date().getTime()};
    set['accounts.facebook.$'] = baseObj;
    //name
    setName(set, data.name);

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
            setName(set, data.name);
            collection.findAndModify({$or:or}, [['_id','asc']], {$push:{'accounts.facebook':baseObj},
                                         $addToSet:addToSet,
                                         $set:set},
                        {safe:true, upsert:true, new: true}, callback);
        } else {
            callback(err, doc);
        }
    });
}

exports.addGoogleContactsData = function(data, callback) {
    var gcID  = data.id;
    var cleanedName = cleanName(data.name);
    var query = {'accounts.googleContacts.data.id':gcID};
    var set = {};
    var baseObj = {data:data, lastUpdated:new Date().getTime()};
    set['accounts.googleContacts.$'] = baseObj;
    setName(set, data.name);

    var addToSet = {};
    if(cleanedName)
        addToSet['_matching.cleanedNames'] = cleanedName;
    //photos
    // if(data.id && data.photo)
    //     addToSet.photos = '/' + lconfig.me + '/gcontacts/photo/' + data.id;
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
            if(!set.emailsort) set.emailsort = data.email[i].value.toLowerCase();
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
            var set = {};
            if (emails) {
                for (var i in emails) {
                    or.push({'emails.value' : emails[i].value});
                    if(!set.emailsort) set.emailsort = emails[i].value;
                }
            }
            setName(set, data.name);
            collection.findAndModify({$or:or}, [['_id','asc']], {$push:{'accounts.googleContacts':baseObj},
                                         $addToSet:addToSet,
                                         $set:set},
                        {safe:true, upsert:true, new: true}, callback);
        } else {
            callback(err, doc);
        }
    });
}

exports.addFlickrData = function(data, callback) {
    var flID  = data.nsid;
    var cleanedName = cleanName(data.realname);
    var query = {'accounts.flickr.data.nsid':flID};
    var set = {};
    var baseObj = {data:data, lastUpdated:Date.now()};
    set['accounts.flickr.$'] = baseObj;
    //name
    setName(set, data.realname);

    var addToSet = {};
    if(cleanedName)
        addToSet['_matching.cleanedNames'] = cleanedName;
    //photos
    if(flID && data.iconfarm && data.iconserver)
        addToSet.photos = 'http://farm' + data.iconfarm + '.static.flickr.com/' + data.iconserver + '/buddyicons/' + flID + '.jpg';
    collection.findAndModify(query, [['_id','asc']], {$set: set, $addToSet:addToSet},
                        {safe:true, new: true}, function(err, doc) {
        if(!doc) {
            //match otherwise
            var or = [{'accounts.foursquare.data.contact.flickr':flID}];
            // var or = [];
            if(cleanedName)
                or.push({'_matching.cleanedNames':cleanedName});

            var set = {};
            setName(set, data.realname);
            collection.findAndModify({$or:or}, [['_id','asc']], {$push:{'accounts.flickr':baseObj},
                                         $addToSet:addToSet,
                                         $set:set},
                        {safe:true, upsert:true, new: true}, callback);
        } else {
            callback(err, doc);
        }
    });
}

exports.addInstagramData = function(data, callback) {
    var cleanedName = cleanName(data.full_name);
    var query = {'accounts.instagram.data.id':data.id};
    var set = {};
    var baseObj = {data:data, lastUpdated:Date.now()};
    set['accounts.instagram.$'] = baseObj;
    //name
    setName(set, data.full_name);

    var addToSet = {};
    if(cleanedName)
        addToSet['_matching.cleanedNames'] = cleanedName;
    //photos
    if(data.profile_picture)
        addToSet.photos = data.profile_picture;
    collection.findAndModify(query, [['_id','asc']], {$set: set, $addToSet:addToSet},
                        {safe:true, new: true}, function(err, doc) {
        if(!doc) {
            //match otherwise
            var or = [{'accounts.instagram.data.contact.id':data.id}];
            // var or = [];
            if(cleanedName)
                or.push({'_matching.cleanedNames':cleanedName});

            var set = {};
            setName(set, data.full_name);
            collection.findAndModify({$or:or}, [['_id','asc']], {$push:{'accounts.instagram':baseObj},
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

function setName(set, name)
{
    if(!name || typeof name != 'string') return;
    set.name = name;
    set.firstnamesort = name.toLowerCase();
    var space = name.lastIndexOf(' ');
    if(space > 1) set.lastnamesort = name.substr(space+1).toLowerCase();
}
