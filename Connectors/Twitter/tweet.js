/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var tw = require('./lib.js');
var async = require('async');

exports.sync = function(processInfo, cb) {
    var posts = processInfo.syncletToRun.posts;
    var ret = {data: { tweets: [] } };
    if(!Array.isArray(posts) || posts.length == 0) return cb(undefined, ret);
    tw.init(processInfo.auth);
    async.forEachSeries(posts, function(post, cb){
        tw.update(post, function(tweet){ ret.data.tweets.push(tweet); }, function(err){
            if(err) console.error("got "+err+" while posting "+JSON.stringify(post));
            cb();
        });
    }, function(err){
        cb(err, ret);
    });
};
