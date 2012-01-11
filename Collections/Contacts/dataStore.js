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
        if (item != null) cbEach(item);
        else cbDone();
    });
}

exports.getLastObjectID = function(cbDone) {
    collection.find({}, {fields:{_id:1}, limit:1, sort:{_id:-1}}).nextObject(cbDone);
}

exports.clear = function(callback) {
    collection.drop(callback);
}

var writeTimer = false;
function updateState() {
    if (writeTimer) clearTimeout(writeTimer);
    writeTimer = setTimeout(function() {
        try {
            lutil.atomicWriteFileSync("state.json", JSON.stringify({updated:Date.now()}));
        } catch (E) {}
    }, 5000);
}

exports.addData = function(type, data, cb) {
    // shim to send events, post-add stuff
    if(typeof inserters[type] === 'function') inserters[type](data, type, function(err, doc) {
        if(doc && doc._id) {
            var idr = lutil.idrNew("contact", "contacts", doc._id);
            locker.ievent(idr, doc);
        }
        cb(err, doc);
    });
}

var inserters = {};


var maps = {
    twitter: {
        photo: 'profile_image_url',
        address: {
            type:'location',
            key:'location'
        },
        nickname: 'screen_name',
        or: {
            'accounts.foursquare.data.contacts.twitter':'screen_name'
        }
    },
    github: {
        nickname: 'login',
        email: 'email',
        photo: function(data) {
            if(data.gravatar_id) return 'https://secure.gravatar.com/avatar/' + data.gravatar_id;
        }
    },
    facebook: {
        photo: function(data) {
            return 'https://graph.facebook.com/' + data.id + '/picture';
        },
        or: {
            'accounts.foursquare.data.contacts.facebook':'id'
        }
    }
};

inserters.generic = function(data, svcName, callback) {
    var map = maps[svcName];
    var idKey = map.id || 'id';
    var id = data[idKey];
    var name = data[map.name || 'name'];
    var cleanedName = cleanName(name);
    var baseObj = createBaseObj(data);
    var photo;
    if(typeof map.photo === 'function') photo = map.photo(data);
    else photo = data[map.photo || 'photo'];
    
    var query = createQuery(data, svcName);
    var set = createSet(baseObj, svcName, name);
    var addToSet = createAddToSet({cleanedName:cleanedName, photo:photo});
    //addresses
    if(map.addresses && map.addresses.key && data[map.addresses.key]) addToSet.addresses = {type:map.addresses.type, value:data[map.addresses.key]};
    
    //nicknames
    if(map.nickname && data[map.nickname]) addToSet.nicknames = data[map.nickname];
    
    //email
    if(map.email && data[map.email]) {
        addToSet.emails = {value:data[map.email]};
        set.emailsort = data[map.email];
    }
    firstFaM(query, set, addToSet, callback, function() {
        genericComplete(svcName, idKey, data, cleanedName, name, baseObj, addToSet, callback);
    });
}

function genericComplete(svcName, idKey, data, cleanedName, name, baseObj, addToSet, callback) {
    var map = maps[svcName];
    //match otherwise
    var obj = {};
    obj['accounts.' + svcName + '.data.' + idKey] = data[idKey];
    var or = [obj];
    for(var i in map.or) {
        obj = {};
        obj[i] = data[map.or[i]];
    }
    if(cleanedName) or.push({'_matching.cleanedNames':cleanedName});
    var set = setName(name);
    var push = {};
    push['accounts.' + svcName] = baseObj;
    
    secondFaM(or, push, addToSet, set, callback);
}

inserters.twitter = inserters.generic;
inserters.github = inserters.generic;
inserters.facebook = inserters.generic;

inserters.foursquare = function(data, svcName, callback) {
    var name = data.firstName;
    if(data.lastName) name += ' ' + data.lastName;
    var cleanedName = cleanName(name);
    var query = createQuery(data, svcName);
    var baseObj = createBaseObj(data);
    var set = createSet(baseObj, svcName, name);
    //gender
    if(data.gender)
        set.gender = data.gender;
    var addToSet = createAddToSet({cleanedName:cleanedName, photo:data.photo});
    //phoneNumbers
    if(data.contact.phone) addToSet.phoneNumbers = {value:data.contact.phone, type:'mobile'};
    //email
    if(data.contact.email) {
        addToSet.emails = {value:data.contact.email};
        set.emailsort = data.contact.email;
    }
    //addresses
    if(data.homeCity) addToSet.addresses = {type:'location', value:data.homeCity};
    firstFaM(query, set, addToSet, callback, function() {
        var or = [{'accounts.foursquare.data.id':data.id}];
        if(cleanedName) or.push({'_matching.cleanedNames':cleanedName});
        if(data.contact.twitter) or.push({'accounts.twitter.data.screen_name':data.contact.twitter});
        if(data.contact.facebook) or.push({'accounts.facebook.data.id':data.contact.facebook});
        var set = setName(name);
        if (data.contact.email) {
            or.push({'emails.value' : data.contact.email});
            set.emailsort = data.contact.email;
        }
        if(data.gender) set.gender = data.gender;
        var push = {'accounts.foursquare':baseObj};
        secondFaM(or, push, addToSet, set, callback);
    });
}

inserters.gcontacts = function(data, svcName, callback) {
    svcName = 'googleContacts';
    var name = data.name;
    var cleanedName = cleanName(name);
    var query = createQuery(data, svcName);
    var baseObj = createBaseObj(data);
    var set = createSet(baseObj, svcName, name);
    var addToSet = createAddToSet({cleanedName:cleanedName});
    //photos
    if(data.id && data.photo) addToSet.photos = '/synclets/gcontacts/getPhoto/' + data.id;
    //addresses
    if(data.address) {
        var addresses = [];
        for(var i in data.address) {
            if(!(data.address[i] && data.address[i].value)) continue;
            addresses.push(data.address[i]);
        }
        addToSet.addresses = {$each:addresses};
    }
    //phones
    if(data.phone) {
        var phones = [];
        for(var i in data.phone) {
            if(!(data.phone[i] && data.phone[i].value)) continue;
            phones.push(data.phone[i]);
        }
        addToSet.phoneNumbers = {$each:phones};
    }
    var emails = [];
    //emails
    if(data.email) {
        for(var i in data.email) {
            if(!(data.email[i] && data.email[i].value)) continue;
            data.email[i].value = data.email[i].value.toLowerCase();
            if(!set.emailsort) set.emailsort = data.email[i].value.toLowerCase();
            emails.push(data.email[i]);
        }
        addToSet.emails = {$each:emails};
    }
    firstFaM(query, set, addToSet, callback, function() {
        //match otherwise
        var or = [{'accounts.googleContacts.data.id':data.id}];
        if(cleanedName) or.push({'_matching.cleanedNames':cleanedName});
        var set = setName(data.name);;
        if (emails) {
            for (var i in emails) {
                or.push({'emails.value' : emails[i].value});
                if(!set.emailsort) set.emailsort = emails[i].value;
            }
        }
        
        var push = {'accounts.googleContacts':baseObj};
        secondFaM(or, push, addToSet, set, callback);
    });
}

inserters.flickr = function(data, svcName, callback) {
    var id = data.nsid;
    var name = data.realname;
    var cleanedName = cleanName(name);
    var query = createQuery(data, svcName, 'nsid');
    var baseObj = createBaseObj(data);
    var set = createSet(baseObj, svcName, name);
    var addToSet = createAddToSet({cleanedName:cleanedName});
    //photos
    if(id && data.iconfarm && data.iconserver) addToSet.photos = 'http://farm' + data.iconfarm + '.static.flickr.com/' + data.iconserver + '/buddyicons/' + id + '.jpg';
    firstFaM(query, set, addToSet, callback, function() {
        //match otherwise
        var or = [{'accounts.foursquare.data.contact.flickr':id}];
        if(cleanedName)
            or.push({'_matching.cleanedNames':cleanedName});
        var set = setName(name);
        var push = {'accounts.flickr':baseObj};
        secondFaM(or, push, addToSet, set, callback);
    });
}

inserters.instagram = function(data, svcName, callback) {
    var name = data.full_name;
    var cleanedName = cleanName(name);
    var query = createQuery(data, svcName);
    var baseObj = createBaseObj(data);
    var set = createSet(baseObj, svcName, name);
    var addToSet = createAddToSet({cleanedName:cleanedName, photo:data.profile_picture});
    firstFaM(query, set, addToSet, callback, function() {
        //match otherwise
        var or = [{'accounts.instagram.data.id':data.id}];
        if(cleanedName) or.push({'_matching.cleanedNames':cleanedName});
        var set = setName(name);
        var push = {'accounts.instagram':baseObj};
        secondFaM(or, push, addToSet, set, callback);
    });
}

inserters.linkedin = function(data, svcName, callback) {
    var name = data.firstName + ' ' + data.lastName;
    var cleanedName = cleanName(name);
    var query = createQuery(data, svcName);
    var baseObj = createBaseObj(data);
    var set = createSet(baseObj, svcName, name);
    var addToSet = createAddToSet({cleanedName:cleanedName});
    if(data.pictureUrl)
        addToSet.photos = data.pictureUrl;
    firstFaM(query, set, addToSet, callback, function() {
        //match otherwise, first entry is just to ensure we never match on nothing
        var or = [{'accounts.linkedin.data.id':data.id}];
        if(cleanedName)
            or.push({'_matching.cleanedNames':cleanedName});
        var set = setName(name);
        var push = {'accounts.linkedin':baseObj};
        secondFaM(or, push, addToSet, set, callback);
    });
}


function createSet(baseObj, svcName, name) {
    var set = setName(name);
    set['accounts.' + svcName + '.$'] = baseObj;
    return set;
}

function createAddToSet(info) {
    var addToSet = {};
    if(info.cleanedName) addToSet['_matching.cleanedNames'] = info.cleanedName;
    if(info.photo) addToSet.photos = info.photo;
    return addToSet;
}

function createBaseObj(data, lastUpdated) {
    return {data:data, lastUpdated : lastUpdated || Date.now()};
}

function createQuery(data, svcName, idFieldName) {
    idFieldName = idFieldName || 'id';
    var obj = {};
    obj['accounts.' + svcName + '.data.' + idFieldName] = data[idFieldName];
    return obj;
}

function firstFaM(query, set, addToSet, done, noDoc) {
    collection.findAndModify(query, [['_id','asc']], 
                            {$set: set, $addToSet:addToSet},
                            {safe:true, new: true}, function(err, doc) {
                                if(!doc) noDoc(err)
                                else done(err, doc);
                            });
}


function secondFaM(or, push, addToSet, set, callback) {
    collection.findAndModify({$or:or}, [['_id','asc']], 
                             {$push:push,
                              $addToSet:addToSet,
                              $set:set},
                             {safe:true, upsert:true, new: true}, callback);
}

function cleanName(name) {
    if(!name || typeof name != 'string') return name;
    return name.toLowerCase();
}

function setName(set, name) {
    if(typeof set !== 'object' && name === undefined) {
        name = set;
        set = {};
    }
    
    if(!name || typeof name != 'string') return set;
    set.name = name;
    set.firstnamesort = name.toLowerCase();
    var space = name.lastIndexOf(' ');
    if(space > 1) set.lastnamesort = name.substr(space+1).toLowerCase();
    return set;
}
