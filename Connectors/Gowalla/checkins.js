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
    var responseObj = {data : { }};
    gowalla.getMe({},function(js){ me = js; }, function(err) {
        if(!me) return cb(err, responseObj);
        var checkins = [];
        gowalla.getCheckins({path:me.url}, function(f){checkins.push(f);}, function(err){
            responseObj.data.checkin = checkins;
            cb(err, responseObj);
        });
    });
}