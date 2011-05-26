/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var IJOD = require('../../Common/node/ijod').IJOD;

var people = {};
var statuses = {};
var mongoCollections;

var mongoID = 'id_str';

exports.init = function(theMongoCollections, callback) {
    mongoCollections = theMongoCollections;
    if(!people.followers && ! people.friends) {
        people.followers = new IJOD('followers');
        people.friends = new IJOD('friends');
        statuses.home_timeline = new IJOD('home_timeline');
        statuses.user_timeline = new IJOD('user_timeline');
        statuses.mentions = new IJOD('mentions');
    }
}

function now() {
    return new Date().getTime();
}

exports.addPerson = function(type, person, callback) {
    var status = person.status;
    delete person.status;
    people[type].addRecord(now(), person, function(err) {
        person.status = status;
        exports.setCurrent(type, person, callback);
    });
}


function getMongo(type, id, callback) {
    var mongo = mongoCollections[type];
    if(!mongo) 
        callback(new Error('invalid type:' + type), null);
    else if(!(id && (typeof id === 'string' || typeof id === 'number')))
        callback(new Error('bad id:' + id), null);
    else
        return mongo;
}

exports.getCurrent = function(type, id, callback) {
    var mongo = getMongo(type, id, callback);
    if(mongo)
        mongo.findOne({'id':id}, callback);
}

exports.setCurrent = function(type, object, callback) {
    var mongo = getMongo(type, object[mongoID], callback);
    if(mongo) {
        var query = {};
        query[mongoID] = object[mongoID];
        mongo.update(query, object, {upsert:true, safe:true}, callback);
    }
}

exports.removeCurrent = function(type, id, callback) {
    var mongo = getMongo(type, id, callback);
    if(mongo) {
        var query = {};
        query[mongoID] = id;
        mongo.remove(query, callback);
    }
}

exports.getAllCurrent = function(type, callback) {
    var mongo = mongoCollections[type];
    if(!mongo) 
        callback(new Error('invalid type:' + type), null);
    else
        mongo.find({}, {}).toArray(callback);
}

exports.logRemovePerson = function(type, id, callback) {
    people[type].addRecord(now(), {id_str:id, id:parseInt(id), deleted:now()}, function(err) {
        exports.removeCurrent(type, id, callback);
    });
}

exports.logUpdatePerson = function(type, person, callback) {
    var status = person.status;
    delete person.status;
    people[type].addRecord(now(), person, function(err) {
        person.status = status;
        exports.setCurrent(type, person, callback);
    });
}

exports.addStatus = function(type, status, callback) {
    statuses[type].addRecord(new Date(status.created_at).getTime(), status, function() {
        exports.setCurrent(type, status, callback);
    });
}
