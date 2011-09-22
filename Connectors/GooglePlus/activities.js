/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var gplus = require('../../Connectors/GooglePlus/lib.js');

exports.sync = function(processInfo, cb) {
    gplus.init(processInfo.auth);
    var me;
    var responseObj = {data : {}, config:{}};
    var since=0;
    var posts = [];
    gplus.getActivities({},function(post){
        posts.push({'obj' : post, timestamp: new Date(), type : 'new'});
    }, function(err) {
            if (err) console.error(err);
            responseObj.data.activity = posts;
            cb(err, responseObj);
    });
}