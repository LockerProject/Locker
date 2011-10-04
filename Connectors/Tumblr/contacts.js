/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var tumblr = require('../../Connectors/Tumblr/lib.js')
  , contacts = []
  ;

exports.sync = function(processInfo, cb) {
    tumblr.init(processInfo.auth);
    tumblr.getFollowing({},function(blog){
        contacts.push({'obj' : blog, timestamp: new Date(), type : 'new'});
    }, function(err) {
            if (err) console.error(err);
            var responseObj = {data : {}};
            responseObj.data.contact = contacts;
            cb(err, responseObj);
    });
}