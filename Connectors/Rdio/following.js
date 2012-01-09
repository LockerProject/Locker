/*
*
* Copyright (C) 2012, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var path = require('path')
  , rdio = require(path.join(__dirname, 'lib.js'));

var contacts = [];

exports.sync = function (processInfo, cb) {
    rdio.getFollowing(0
                    , processInfo.auth
                    , function (following) {
                          following.id = following.key;
                          contacts.push({obj : following
                                       , timestamp : new Date()
                                       , type : 'new'});
                      }
                    , function (err) {
                          if (err) console.error(err);
                          cb(err, {data : {contact : contacts}});
                      }
    );
};
