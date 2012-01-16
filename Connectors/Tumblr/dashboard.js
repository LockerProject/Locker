/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var tumblr = require('./lib.js');

exports.sync = function(processInfo, cb) {
    tumblr.init(processInfo.auth);
    var me;
    var responseObj = {data : {}, config:{}};
    var since=0;
    var posts = [];
    if (processInfo.config && processInfo.config.updateState && processInfo.config.updateState.dashboard) {
        since = processInfo.config.updateState.dashboard.since;
    }
    tumblr.getDashboard({since_id:since},function(post){
        posts.push({'obj' : post, timestamp: new Date(), type : 'new'});
        if(post.id > since) since = post.id;
    }, function(err) {
            if (err) console.error(err);
            responseObj.data.dashboard = posts;
            responseObj.config.updateState = {dashboard:{since:since}};            
            cb(err, responseObj);
    });
}
