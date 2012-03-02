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
var async = require('async');

exports.sync = function(processInfo, cb) {
    tw = require(path.join(processInfo.absoluteSrcdir, 'lib.js'));
    tw.init(processInfo.auth, processInfo.workingDirectory, processInfo.absoluteSrcdir);
    var posts = processInfo.syncletToRun.posts;
    var ret = {data: { tweets: [] } };
    if(!Array.isArray(posts) || posts.length == 0) return cb(undefined, ret);
    async.forEachSeries(posts, function(post, cb){
        tw.update(post, function(tweet){ ret.data.tweets.push(tweet); }, function(err){
            if(err) console.error("got "+err+" while posting "+JSON.stringify(post));
            cb();
        });
    }, function(err){
        cb(err, ret);
    });
};
