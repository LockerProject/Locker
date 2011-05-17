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
exports.init = function(callback) {
    if(!people.followers && ! people.friends) {
        ijodLib.createIJOD('followers', [{fieldName:'timeStamp', fieldType:'REAL'}], function(ijod) {
            people.followers = ijod;
            ijodLib.createIJOD('friends', [{fieldName:'timeStamp', fieldType:'REAL'}], function(ijod) {
                people.friends = ijod;
                callback();
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
    var ijod = people[type];
    ijod.addRecord({timeStamp:now(), type:'new', data:person});
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
        var allContacts = {};
        for(var i in friends) {
            var friend = friends[i].data;
            if(!friend)
                continue;
            friend.isFriend = true;
            allContacts[friend.id_str] = friend;
        }
        exports.getPeople('followers', {recordID:-1}, function(err, followers) {
            for(var j in followers) {
                var follower = followers[j].data;
                if(!follower)
                    continue;
                if(allContacts[follower.id_str]) {
                    allContacts[follower.id_str].isFollower = true;
                } else {
                    follower.isFollower = true;
                    allContacts[follower.id_str] = follower;
                }
            }
            var arr = [];
            for(var k in allContacts)
                arr.push(allContacts[k]);
            callback(arr);
        });
    });
}
