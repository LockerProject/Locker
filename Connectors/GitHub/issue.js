/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/


var request = require("request");
var async = require('async');

exports.sync = function(pi, cb) {
    if(!pi.syncletToRun || !pi.syncletToRun.posts) return cb("no posts");
    var issues = pi.syncletToRun.posts;
    if(!Array.isArray(issues) || issues.length == 0) return cb("no issues");
    var errors = [];
    async.forEachSeries(issues, function(issue, cb2){
        if(!issue.repo) return cb2();
        var url = "https://api.github.com/repos/"+pi.auth.username+"/"+issue.repo+"/issues?access_token="+pi.auth.accessToken;
        delete issue.repo;
        console.error(url);
        request.post({uri:url, body:JSON.stringify(issue)}, function(err, resp, body){
            if(err) errors.push(err); // accumulate them for mass return
            console.error(resp);
            console.error(body);
            cb2();
        });
    }, function(){
        cb(errors.join(""));
    });
};
