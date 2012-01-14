/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var instagram = require('./lib.js');

// really dumb, just get the last 50 photos posted and received and process them, any new comments/likes will generate updated events
exports.sync = function(processInfo, cb) {
    instagram.init(processInfo.auth);
    var responseObj = {data : {}};
    instagram.getMediaRecent({count:50}, function(err, photos){
        if(photos) responseObj.data.photo = photos;
        instagram.getFeedRecent({count:50}, function(err, posts){
            if(posts) responseObj.data.feed = posts;
            cb(err, responseObj);
        });
    });
}