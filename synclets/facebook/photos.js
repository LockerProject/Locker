/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fb = require('../../Connectors/Facebook/lib.js')
  , contacts = []
  ;

exports.sync = function(processInfo, cb) {
    fb.init(processInfo.auth);
    exports.syncFriends(function(err) {
        if (err) console.error(err);
        var responseObj = {data : {}};
        responseObj.data.contact = contacts;
        cb(err, responseObj);
    });
};

exports.syncFriends = function(callback) {
    fb.getFriends({id:"me"},function(friend){
        contacts.push({'obj' : friend, timestamp: new Date(), type : 'new'});
    },callback);
}