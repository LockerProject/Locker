/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var path = require('path');
var tw;

exports.sync = function(processInfo, cb) {
    tw = require(path.join(processInfo.absoluteSrcdir, 'lib.js'));
    tw.init(processInfo.auth, processInfo.absoluteSrcdir);
    var self;
    tw.getMe({}, function(js){ self = js; }, function(err) {
        if (err) return cb(err);
        processInfo.auth.profile = self; // map to shared profile
        cb(err, {data: { self: [self] }, auth: processInfo.auth});
    });
};
