/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var tw = require('../../Connectors/Twitter/lib.js')
  , contacts = []
  ;

exports.sync = function(processInfo, cb) {
    tw.init(processInfo.auth);
    exports.syncFriends(function(err) {
        if (err) console.error(err);
        var responseObj = {data : {}};
        responseObj.data.contact = contacts;
        cb(err, responseObj);
    });
};

exports.syncFriends = function(callback) {
    tw.getMyFriends({},function(friend){
        contacts.push({'obj' : friend, timestamp: new Date(), type : 'new'});
    },callback);
}
