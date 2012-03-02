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
    tw.init(processInfo.auth, processInfo.workingDirectory, processInfo.absoluteSrcdir);
    var me;
    var responseObj = {data : {}, config:{}};
    var since=1;
    if (processInfo.config && processInfo.config.updateState && processInfo.config.updateState.timeline) {
        since = processInfo.config.updateState.timeline.since;
    }
    tw.getMe({},function(js){me=js}, function(err){
        if(err) return cb(err, responseObj);
        var statuses = [];
        tw.getTimeline({screen_name:me.screen_name,since_id:since},function(js){
            statuses.push({'obj' : js, timestamp: new Date(), type : 'new'});
            if(js.id > since) since = js.id;
        },function(err){
            responseObj.data.timeline = statuses;
            responseObj.config.updateState = {timeline:{since:since}};
            cb(err, responseObj);
        });
    });
};
