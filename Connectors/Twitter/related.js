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
    var me;
    var responseObj = {data : {}};
    tw.getMe({},function(js){me=js}, function(err){
        if(err) return cb(err, responseObj);
        var statuses = false;
        tw.getTimelinePage({screen_name:me.screen_name, count:50},function(js){
            statuses = js;
        },function(err){
            if(!statuses) return cb(err, responseObj);
            var related = [];
            async.forEachSeries(statuses,function(tweet,callback){
                tw.getRelated({id:tweet.id_str},function(rel){
                    related.push({'obj' : {id:tweet.id_str,related:rel}, timestamp: new Date(), type : 'new'});
                },callback);
            },function(err){
                responseObj.data.related = related;
                cb(err, responseObj);
            });
        });
    });
};

