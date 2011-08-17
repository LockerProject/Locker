/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var tw = require('../../Connectors/Twitter/lib.js');

exports.sync = function(processInfo, cb) {
    tw.init(processInfo.auth);
    var me;
    var responseObj = {data : {}};
    tw.getMe({},function(js){me=js}, function(err){
        if(err) return cb(err, responseObj);
        var statuses = [];
        tw.getTimeline({screen_name:me.screen_name},function(js){ statuses.push({'obj' : js, timestamp: new Date(), type : 'new'}) },function(err){
            responseObj.data.mentions = statuses;
            cb(err, responseObj);
        });
    });
};
