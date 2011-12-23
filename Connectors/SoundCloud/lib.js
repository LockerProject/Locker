/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var client = require('soundcloud-js');

exports.genericSync = function(type) {
    return function(processInfo, cb) {
        client.apiCall('GET', '/me/' + type, {oauth_token: processInfo.auth.token.access_token}, function(err, resp, respData) {
            var data = {};
            data[type] = Array.isArray(respData)? respData : [respData];
            cb(err, {config:{}, data: data});
        });
    };
};
