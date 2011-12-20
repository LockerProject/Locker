/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var gowalla = require('../../Connectors/Gowalla/lib.js');

exports.sync = function(processInfo, cb) {
    gowalla.init(processInfo.auth);
    var me;
    gowalla.getMe({},function(js){ me = js; }, function(err) {
        var responseObj = {data : { }};
        if(me) responseObj.data.profile = [me];
        cb(err, responseObj);
    });
}