/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var tw = require('../../Connectors/Twitter/lib.js');
var async = require('async');

exports.sync = function(processInfo, cb) {
    tw.init(processInfo.auth);
    var me;
    var responseObj = {data : {}};
    tw.getMe({},function(js){me=js}, function(err){
        if(err) return cb(err, responseObj);
        var statuses = false;
        tw.getTimelinePage({screen_name:me.screen_name},function(js){
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

