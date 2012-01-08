/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var gplus = require('../../Connectors/GooglePlus/lib.js');
var fs = require('fs');

exports.sync = function(processInfo, cb) {
    // temp hack to get this stuff that isn't in .auth
    var keys = JSON.parse(fs.readFileSync('../../Config/apikeys.json'));
    processInfo.auth.appKey = keys.gplus.appKey;
    processInfo.auth.appSecret = keys.gplus.appSecret;
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