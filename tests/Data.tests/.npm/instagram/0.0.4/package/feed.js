/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var instagram = require('./lib.js');

exports.sync = function(processInfo, cb) {
    instagram.init(processInfo.auth);
    var responseObj = {data : {}, config:{}};
    var since="";
    var posts = [];
    if (processInfo.config && processInfo.config.feedSince) {
        since = processInfo.config.feedSince;
        responseObj.config.feedSince = since;
    }
    instagram.getFeed({min_id:since}, function(post){
        posts.push({'obj' : post, timestamp: new Date(), type : 'new'});
        if(parseInt(post.id) > parseInt(since)) since = post.id;
    }, function(err) {
            if (err) console.error(err);
            responseObj.data.feed = posts;
            responseObj.config.feedSince = since;
            cb(err, responseObj);
    });


}