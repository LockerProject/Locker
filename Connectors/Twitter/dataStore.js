/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var ijodLib = require('../../Common/node/ijod');

var people = {};
var statuses = {};
exports.init = function(callback) {
    if(!people.followers && ! people.friends) {
        ijodLib.createIJOD('followers', [{fieldName:'timeStamp', fieldType:'REAL'}, 
                                         {fieldName:'data.id', fieldType:'REAL'}], function(ijod) {
            people.followers = ijod;
            ijodLib.createIJOD('friends', [{fieldName:'timeStamp', fieldType:'REAL'}, 
                                           {fieldName:'data.id', fieldType:'REAL'}], function(ijod) {
                people.friends = ijod;
                ijodLib.createIJOD('home_timeline', [{fieldName:'timeStamp', fieldType:'REAL'}, 
                                                     {fieldName:'data.id', fieldType:'REAL'}], function(ijod) {
                    statuses.home_timeline = ijod;
                    ijodLib.createIJOD('mentions', [{fieldName:'timeStamp', fieldType:'REAL'}, 
                                                    {fieldName:'data.id', fieldType:'REAL'}], function(ijod) {
                        statuses.mentions = ijod;
                        callback();
                    });
                });
            });
        });
    } else {
        callback();
    }
}

function now() {
    return new Date().getTime();
}

exports.addPerson = function(type, person) {
    people[type].addRecord({timeStamp:now(), type:'add', data:person});
}

exports.logRemovePerson = function(type, id) {
    people[type].addRecord({timeStamp:now(), type:'remove', data:{id_str:id, id:parseInt(id)}});
}

exports.logUpdatePerson = function(type, person) {
    people[type].addRecord({timeStamp:now(), type:'update', data:person});
}

exports.getPeople = function(type, query, callback) {
    var ijod = people[type];
    if(!callback && typeof query == 'function') {
        callback = query;
        query = {recordID:-1};
    }
    if(query.hasOwnProperty('recordID')) {
        ijod.getAfterRecordID(query.recordID, callback);
    } else if(query.hasOwnProperty('timeStamp')) {
        ijod.getAfterFieldsValueEquals('timeStamp', query.timeStamp, callback);
    } else {
        callback(new Error('invalid query, must contain either a recordID or timeStamp'), null);
    }
}

exports.getAllContacts = function(callback) {
    exports.getPeople('friends', {recordID:-1}, function(err, friends) {
        var allContacts = {friends:friends};
        exports.getPeople('followers', {recordID:-1}, function(err, followers) {
            allContacts.followers = followers;
            callback(allContacts);
        });
    });
}

exports.addStatus = function(type, status) {
    statuses[type].addRecord({timeStamp:new Date(status.created_at).getTime(), type:'add', data:status});
}

exports.getStatuses = function(type, query, callback) {
    var ijod = statuses[type];
    if(!callback && typeof query == 'function') {
        callback = query;
        query = {recordID:-1};
    }
    if(query.hasOwnProperty('recordID')) {
        ijod.getAfterRecordID(query.recordID, callback);
    } else if(query.hasOwnProperty('timeStamp')) {
        ijod.getAfterFieldsValueEquals('timeStamp', query.timeStamp, callback);
    } else {
        callback(new Error('invalid query, must contain either a recordID or timeStamp'), null);
    }
}