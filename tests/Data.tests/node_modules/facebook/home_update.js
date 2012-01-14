/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fb = require('./lib.js')
  , posts = []
  ;


exports.sync = function(processInfo, cb) {
    fb.init(processInfo.auth);
    var arg = {id:"me",type:"home",since:"yesterday"}; // only monitoring changes within the last 24h for now?
    fb.getPosts(arg,function(post){
        if(post.updated_time > post.created_time) posts.push({'obj' : post, timestamp: new Date(), type : 'update'});
    },function(err) {
        var responseObj = {data : {}};
        responseObj.data.home = posts;
        cb(err, responseObj);
    });
};
