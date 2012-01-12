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
    },
    flickr: {
        id: 'nsid',
        name: 'realname',
        nickname: 'username',
        photo: function(data) {
            if(data.nsid && data.iconfarm && data.iconserver) return 'http://farm' + data.iconfarm + '.static.flickr.com/' + data.iconserver + '/buddyicons/' + data.nsid + '.jpg';
        }
    },
    instagram: {
        name: 'full_name',
        photo: 'profile_picture',
        nickname: 'username'
    },
    linkedin: {
        name: function(data) {
            return data.firstName + ' ' + data.lastName;
        },
        photo: 'pictureUrl'
    },
    foursquare: {
        name: function(data) {
            return data.firstName + (data.lastName? ' ' + data.lastName: '');
        },
        gender: 'gender',
        email : 'contact.email',
        phoneNumber : {
            key: 'contact.phone',
            type: 'mobile'
        },
        address: {
            type: 'location',
            key: 'homeCity'
        },
        or: {
            'accounts.twitter.data.screen_name':'contact.twitter',
            'accounts.facebook.data.id':'contact.facebook'
        }
    },
    gcontacts: {
        photo: function(data) {
            if(data.id && data.photo) return '/synclets/gcontacts/getPhoto/' + data.id;
        },
        address: {
            key: 'address'
        },
        phoneNumber: {
            key: 'phone'
        },
        email: 'email'
    }
};

var inserters = {};
inserters.generic = function(data, svcName, callback) {
    var map = maps[svcName];
    var idKey = map.id || 'id';
    var id = data[idKey];
    
    var name;
    if(typeof map.name === 'function') name = map.name(data);
    else name = data[map.name || 'name'];
    
    var cleanedName = cleanName(name);
    var baseObj = createBaseObj(data);
    var photo;
    if(typeof map.photo === 'function') photo = map.photo(data);
    else photo = data[map.photo || 'photo'];
    
    var query = createQuery(data, svcName);
    
    var set = createSet(baseObj, svcName, name);
    //gender
    var gender = getNested(data, map.gender);
    if(gender) set.gender = gender;
    
    var addToSet = createAddToSet({cleanedName:cleanedName, photo:photo});
    
    //addresses
    var address = getNested(data, map.address);
    if(address) {
        if(address instanceof Array) addToSet.addresses = {$each:address};
        else addToSet.addresses = {type:map.address.type, value:address};
    }
    
    //nicknames
    var nickname = getNested(data, map.nickname);
    if(nickname) addToSet.nicknames = nickname;
    
    //email
    var email = getNested(data, map.email);
    if(email) {
        if(email instanceof Array) {
            for(var i in email) {
                var eml = email[i];
                for(var i in eml) {
                    if(typeof eml[i] === 'string') eml[i] = eml[i].toLowerCase();
                }
            }
            addToSet.emails = {$each:email};
        } else {
            addToSet.emails = {value:email.toLowerCase()};
        }
        set.emailsort = email;
    }
    
    //phoneNumber
    var phoneNumber = getNested(data, map.phoneNumber);
    if(phoneNumber) {
        if(phoneNumber instanceof Array) addToSet.phoneNumber = {$each:phoneNumber};
        else addToSet.phoneNumber = {type:map.phoneNumber.type, value:phoneNumber};
    }
    
    firstFaM(query, set, addToSet, callback, function() {
        genericComplete(svcName, idKey, data, cleanedName, name, baseObj, addToSet, callback);
    });
}

inserters.twitter = inserters.generic;
inserters.github = inserters.generic;
inserters.facebook = inserters.generic;
inserters.flickr = inserters.generic;
inserters.instagram = inserters.generic;
inserters.linkedin = inserters.generic;
inserters.foursquare = inserters.generic;
inserters.gcontacts = inserters.generic;


function genericComplete(svcName, idKey, data, cleanedName, name, baseObj, addToSet, callback) {
    var map = maps[svcName];
    //match otherwise
    var obj = {};
    obj['accounts.' + svcName + '.data.' + idKey] = data[idKey];
    var or = [obj];
    for(var i in map.or) {
        obj = {};
        obj[i] = getNested(data, map.or[i]);
        if(obj[i]) or.push(obj);
    }
    if(cleanedName) or.push({'_matching.cleanedNames':cleanedName});
    var set = setName(name);
    
    //gender
    var gender = getNested(data, map.gender);
    if(gender) set.gender = gender;
    
    var push = {};
    push['accounts.' + svcName] = baseObj;
    
    secondFaM(or, push, addToSet, set, callback);
}


function getNested(data, key) {
    if(!key) return;
    if(typeof key === 'object') key = key.key;
    if(key.indexOf('.') === -1) return data[key];
    var keys = key.split('.');
    var value = data;
    for(var i in keys) {
        value = value[keys[i]]
        if(value === undefined || value === null) return value;
    }
    return value;
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

var jl = {
id: "5301205",
name: "Josh Lasky",
first_name: "Josh",
last_name: "Lasky",
gender: "male",
locale: "en_US",
link: "http://www.facebook.com/joshua.lasky",
username: "joshua.lasky",
third_party_id: "Hi7_50vEi3GA6WnKY6fY5TfAq9U",
updated_time: 1325568929
}

var bd = {
id: "5302558",
name: "Ben Detofsky",
first_name: "Ben",
last_name: "Detofsky",
gender: "male",
locale: "en_US",
link: "http://www.facebook.com/ben.detofsky",
username: "ben.detofsky",
third_party_id: "51wtaQOUc3kcgpuXDTmw51Xjz5g",
updated_time: 1323020371
}

inserters.generic