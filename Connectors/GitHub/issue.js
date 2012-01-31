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

exports.sync = function(arg, cb) {
    if(!arg.syncletToRun || !arg.syncletToRun.posts) return cb("no posts");
    var issues = arg.syncletToRun.posts;
    if(!Array.isArray(issues) || issues.length == 0) return cb("no issues");
    var errors = [];
    var ret = {data:{issue:[]}};
    async.forEachSeries(issues, function(issue, cb2){
        if(!issue.repo) return cb2();
        var url = "https://api.github.com/repos/"+issue.repo+"/issues?access_token="+arg.auth.accessToken;
        if(!issue.labels) issue.labels = [];
        // labels must be created first, if any, pretty lame
        async.forEachSeries(issue.labels, function(name, cb3){ label(arg.auth.accessToken, issue.repo, name, cb3); }, function(){
            delete issue.repo;
            request.post({uri:url, json:issue}, function(err, resp, body){
                if(err) errors.push(err); // accumulate them for mass return
                ret.data.issue.push(body);
                cb2();
            });
        });
    }, function(){
        cb(errors.join(""), ret);
    });
};

// if a label doesn't exist, create it
function label(token, repo, name, cb)
{
    request.get({uri:"https://api.github.com/repos/"+repo+"/labels/"+name+"?access_token="+token, json:true}, function(err, resp, body){
        if(body && body.name == name) return cb();
        request.post({uri:"https://api.github.com/repos/"+repo+"/labels?access_token="+token, body:JSON.stringify({name:name, color:'FFFFFF'})}, function(err, resp, body){
            cb();
        });
    });
}