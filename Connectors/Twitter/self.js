/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var tw = require('./lib.js');

exports.sync = function(processInfo, cb) {
    tw.init(processInfo.auth);
    var self;
    tw.getMe({}, function(js){ self = js; }, function(err) {
        if (err) return cb(err);
        processInfo.auth.profile = self; // map to shared profile
        cb(err, {data: { self: [self] }, auth: processInfo.auth});
    });
};
