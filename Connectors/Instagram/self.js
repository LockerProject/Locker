/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var instagram = require('../../Connectors/Instagram/lib.js');
var self = {};

exports.sync = function(processInfo, cb) {
    instagram.init(processInfo.auth);
    instagram.getSelf({},function(me){ self = me; }, function(err) {
            if (err) console.error(err);
            cb(err, {data : {profile : [{obj: self}]}});
    });
}