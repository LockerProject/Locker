/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var IJOD = require('../../Common/node/ijod').IJOD;
var sqlite = require('sqlite');

var INDEXED_FIELDS = [{fieldName:'timeStamp', fieldType:'REAL'}, {fieldName:'data.id', fieldType:'REAL'}];

var friends = undefined;
var currentDB = new sqlite.Database();
exports.init = function(callback) {
    if(!friends) {
        friends = new IJOD('friends', INDEXED_FIELDS);
        places = new IJOD('places', INDEXED_FIELDS);
        friends.init(function() {
            places.init(function() {
                openDB(callback);
            })
        });
    } else {
        callback();
    }
}

function openDB(callback) {
    currentDB.open('current.db', function(err) {
        currentDB.execute('CREATE TABLE IF NOT EXISTS friends (id INTEGER PRIMARY KEY, profile TEXT);', callback);
    });
}

function now() {
    return new Date().getTime();
}

exports.addFriend = function(person) {
    friends.addRecord({timeStamp:now(), type:'add', data:person});
    addFriendToCurrent(person, function(err) {
        if(err)
            console.error(err);
    });
}

exports.getFriendFromCurrent = function(id, callback) {
    var sql = "SELECT profile FROM friends WHERE id = ?;";
    currentDB.execute(sql, [id], callback);
}

function addFriendToCurrent(person, callback) {
    var sql = "INSERT OR REPLACE INTO friends(id, profile) VALUES (?, ?);";
    currentDB.execute(sql, [person.id, JSON.stringify(person)], callback);
}

exports.logRemovePerson = function(id) {
    friends.addRecord({timeStamp:now(), type:'remove', data:{id_str:id, id:parseInt(id)}});
    removePersonFromCurrent(id, function(err) {
        if(err)
            console.error(err);
    })
}

function removePersonFromCurrent(id, callback) {
    if(typeof id !== 'number') {
        id = parseInt(id);
    }
    var sql = "DELETE FROM friends WHERE id = ?;";
    currentDB.execute(sql, [id], callback);
}

exports.logUpdatePerson = function(person) {
    friends.addRecord({timeStamp:now(), type:'update', data:person});
    updatePersonInCurrent(type, person, function(err) {
        if(err)
            console.error(err);
    });
}

function updatePersonInCurrent(person, callback) {
    var sql = "UPDATE friends SET profile = ? WHERE id = ?;";
    currentDB.execute(sql, [JSON.stringify(person), person.id], callback);
}


exports.getPeople = function(query, callback) {
    if(!callback && typeof query == 'function') {
        callback = query;
        query = {recordID:-1};
    }
    if(query.hasOwnProperty('recordID')) {
        friends.getAfterRecordID(query.recordID, callback);
    } else if(query.hasOwnProperty('timeStamp')) {
        friends.getAfterFieldsValueEquals('timeStamp', query.timeStamp, callback);
    } else {
        callback(new Error('invalid query, must contain either a recordID or timeStamp'), null);
    }
}

exports.getPeopleCurrent = function(callback) {
    currentDB.execute('SELECT profile FROM friends;', function(err, profileStrs) {
        if(err) {
            callback(err, profileStrs);
            return;
        }
        var profiles = [];
        for(var i in profileStrs) {
            try {
                profiles.push(JSON.parse(profileStrs[i].profile));
            } catch(err) {
                console.error(err);
            }
        }
        callback(err, profiles);
    });
}

exports.addPlace = function(checkin) {
    places.addRecord({timeStamp:new Date(checkin.createdAt).getTime(), type:'add', data:checkin});
}

exports.getPlaces = function(query, callback) {
    if(!callback && typeof query == 'function') {
        callback = query;
        query = {recordID:-1};
    }
    if(query.hasOwnProperty('recordID')) {
        places.getAfterRecordID(query.recordID, callback);
    } else if(query.hasOwnProperty('timeStamp')) {
        places.getAfterFieldsValueEquals('timeStamp', query.timeStamp, callback);
    } else {
        callback(new Error('invalid query, must contain either a recordID or timeStamp'), null);
    }
}