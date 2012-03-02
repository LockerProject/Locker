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
    tw.init(processInfo.auth, processInfo.workingDirectory);
    var me;
    var responseObj = {data : {}, config:{}};
    var since=1;
    if (processInfo.config && processInfo.config.updateState && processInfo.config.updateState.tweets) {
        since = processInfo.config.updateState.tweets.since;
    }
    tw.getMe({},function(js){me=js}, function(err){
        if(err) return cb(err, responseObj);
        var statuses = [];
        tw.getTweets({screen_name:me.screen_name,since_id:since},function(js){
            statuses.push({'obj' : js, timestamp: new Date(), type : 'new'});
            if(js.id > since) since = js.id+10;// their api sometimes returns the last one repeatedly, L4M30
        },function(err){
            responseObj.data.tweets = statuses;
            responseObj.config.updateState = {tweets:{since:since}};
            cb(err, responseObj);
        });
    });
};
