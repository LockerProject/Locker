/*
*
* Copyright (C) 2012, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/


exports.genericSync = function(pather, arrayer) {
    return function(pi, cb) {
        client = require('fitbit-js')(pi.auth.appKey, pi.auth.appSecret);
        var path = pather(pi);
        if(!path) return cb(null, pi);
        // need foo:bar to make fitbit api work right otehrwie no params appends ? and get BROKEN erro!
        client.apiCall('GET', '/user/-/' + path, {token:pi.auth.token, foo:'bar'}, function(err, respData) {
            if(err || !respData) return cb(err);
            pi.data = arrayer(pi, respData);
            cb(err, pi);
        });
    };
};
