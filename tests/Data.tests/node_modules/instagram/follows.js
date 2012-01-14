/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var instagram = require('./lib.js')
  , contacts = []
  ;

exports.sync = function(processInfo, cb) {
    instagram.init(processInfo.auth);
    instagram.getFollows({},function(follow){
        contacts.push({'obj' : follow, timestamp: new Date(), type : 'new'});
    }, function(err) {
            if (err) console.error(err);
            var responseObj = {data : {}};
            responseObj.data.contact = contacts;
            cb(err, responseObj);
    });
}