/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var tumblr = require('../../Connectors/Tumblr/lib.js');

exports.sync = function(processInfo, cb) {
    tumblr.init(processInfo.auth);
    var me;
    var responseObj = {data : {}, config:{}};
    var since=0;
    if (processInfo.config && processInfo.config.updateState && processInfo.config.updateState.dashboard) {
        since = processInfo.config.updateState.dashboard.since;
        responseObj.config.updateState = {posts:{since:since}};
    }

    // first find the person's primary blog... 
    // TODO: should we walk them all?
    var me;
    tumblr.getMe({},function(js){ me=js}, function(err){
    	if(err || !me) return cb(err, responseObj);
    });

    var posts = [];
    tumblr.getPosts({blog:me.primary, since_id:since}, function(post){
        posts.push({'obj' : post, timestamp: new Date(), type : 'new'});
        if(post.id > since) since = post.id;
    }, function(err) {
            if (err) console.error(err);
            responseObj.data.posts = posts;
            responseObj.config.updateState = {posts:{since:since}};            
            cb(err, responseObj);
    });
}