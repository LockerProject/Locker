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
var links = {};
var mongoCollections;

var mongoID = 'id_str';

exports.init = function(theMongoCollections, callback) {
    console.log('dataStore.init');
    mongoCollections = theMongoCollections;
    if(!people.friends) {
        people.friends = new IJOD('friends');
        links.newsfeed = new IJOD('newsfeed');
        links.wall = new IJOD('wall');
    }
};

function now() {
    return new Date().getTime();
}

exports.addPerson = function(type, person, callback) {
    people[type].addRecord(now(), person, function(err) {
        exports.setCurrent(type, person, callback);
    });
};


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
};

exports.setCurrent = function(type, object, callback) {
    var mongo = getMongo(type, object[mongoID], callback);
    if(mongo) {
        var query = {};
        query[mongoID] = object[mongoID];
        mongo.update(query, object, {upsert:true, safe:true}, callback);
    }
};

exports.removeCurrent = function(type, id, callback) {
    var mongo = getMongo(type, id, callback);
    if(mongo) {
        var query = {};
        query[mongoID] = id;
        mongo.remove(query, callback);
    }
};

exports.getAllCurrent = function(type, callback) {
    var mongo = mongoCollections[type];
    if(!mongo) 
        callback(new Error('invalid type:' + type), null);
    else
        mongo.find({}, {}).toArray(callback);
};

exports.logRemovePerson = function(type, id, callback) {
    people[type].addRecord(now(), {id_str:id, id:Number(id), deleted:now()}, function(err) {
        exports.removeCurrent(type, id, callback);
    });
};

exports.logUpdatePerson = function(type, person, callback) {
    people[type].addRecord(now(), person, function(err) {
        exports.setCurrent(type, person, callback);
    });
};

exports.addLink = function(type, link, callback) {
    links[type].addRecord(new Date(link.created_time).getTime(), link, function() {
        exports.setCurrent(type, link, callback);
    });
};
