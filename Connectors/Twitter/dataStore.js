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
var followers, friends;
exports.init = function(callback) {
    ijodLib.createIJOD('followers', [{fieldName:'timeStamp', fieldType:'REAL'}], function(ijod) {
        people.followers = ijod;
        ijodLib.createIJOD('friends', [{fieldName:'timeStamp', fieldType:'REAL'}], function(ijod) {
            people.friends = ijod;
            callback();
        });
    })
}

function now() {
    return new Date().getTime();
}

exports.addPerson = function(type, person) {
    var ijod = people[type];
    ijod.addRecord({timeStamp:now(), type:'new', data:person});
}
