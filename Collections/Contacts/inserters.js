var maps = require('./dataMap');

var collection;
exports.init = function(_collection) {
    collection = _collection;
}

exports.generic = function(data, svcName, callback) {
    var map = maps[svcName];
    var idKey = map.id || 'id';
    var id = data[idKey];

    var name;
    if(typeof map.name === 'function') name = map.name(data);
    else name = data[map.name || 'name'];

    // wrapper around data
    var baseObj = {data:data, lastUpdated : Date.now()};

    // match only on id
    var query = {};
    query['accounts.' + svcName + '.data.' + idKey] = id;

    // set individual values
    var set = setName(name);
    set['accounts.' + svcName + '.$'] = baseObj;

    //gender
    var gender = getNested(data, map.gender);
    if(gender) set.gender = gender;

    // add items to sets, such as phone number, emails, etc
    var addToSet = {};
    var cleanedName = cleanName(name);
    if(cleanedName) addToSet['_matching.cleanedNames'] = cleanedName;

    if(typeof map.photo === 'function') addToSet.photos = map.photo(data);
    else addToSet.photos = data[map.photo || 'photo'];
    if(!addToSet.photos) delete addToSet.photos;
    
    //addresses
    var address = getNested(data, map.address);
    if(address) {
        // if it's an array, assume object inside are well formatted and just add them all
        if(address instanceof Array) addToSet.addresses = {$each:address};
        // else, use the type specified in the map
        else addToSet.addresses = {type:map.address.type, value:address};
    }

    // nicknames - twitter handle, github login, flickr username, etc
    var nickname = getNested(data, map.nickname);
    if(nickname) addToSet.nicknames = nickname;

    // email
    var email = getNested(data, map.email);
    if(email) {
        if(email instanceof Array) {
            for(var i in email) { // lowercase EVERYTHING
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
    if(phoneNumber) { // same logic as addresses
        if(phoneNumber instanceof Array) addToSet.phoneNumber = {$each:phoneNumber};
        else addToSet.phoneNumber = {type:map.phoneNumber.type, value:phoneNumber};
    }

    matchExisting(query, set, addToSet, callback, function() {
        //match otherwise
        var obj = {};
        obj['accounts.' + svcName + '.data.' + idKey] = data[idKey];
        var or = [obj];
        // or fields are used for matching across account types, e.g. foursquare returns a bunch of social account data
        for(var i in map.or) {
            obj = {};
            obj[i] = getNested(data, map.or[i]);
            if(obj[i]) or.push(obj);
        }
        if(cleanedName) or.push({'_matching.cleanedNames':cleanedName});
        if(addToSet.emails) {
            var emails = addToSet.emails.$each || [addToSet.emails];
            for(var i in emails) or.push({'emails.value':emails[i].value});
        }
        
        var set = setName(name);
        //gender
        var gender = getNested(data, map.gender);
        if(gender) set.gender = gender;

        var push = {};
        push['accounts.' + svcName] = baseObj;

        upsert(or, push, addToSet, set, callback);
    });
}

// add the generic inserters
for(var i in maps) exports[i] = exports.generic;

// get the value for the key, split on . if needed
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

// first try at inserting an object into mongo, only match on the object's id
function matchExisting(query, set, addToSet, done, noDoc) {
    collection.findAndModify(query, [['_id','asc']], 
                            {$set: set, $addToSet:addToSet},
                            {safe:true, new: true}, function(err, doc) {
                                if(!doc) noDoc(err)
                                else done(err, doc);
                            });
}

// second try at inserting and object into mongo, match more heuristically (name, etc)
function upsert(or, push, addToSet, set, callback) {
    collection.findAndModify({$or:or}, [['_id','asc']], 
                             {$push:push,
                              $addToSet:addToSet,
                              $set:set},
                             {safe:true, upsert:true, new: true}, callback);
}

// create a more "matchable" version of the name
function cleanName(name) {
    if(!name || typeof name != 'string') return name;
    return name.toLowerCase();
}

function setName(name) {
    if(!name || typeof name !== 'string') return {};
    return {name: name, firstnamesort: name.toLowerCase()};
}
