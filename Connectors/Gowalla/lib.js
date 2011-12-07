/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    request = require('request'),
    async = require('async'),
    url = require('url'),
    sys = require('sys');

var auth;
var base = 'http://api.gowalla.com';

exports.init = function(theAuth) {
    auth = theAuth;
};

exports.getMe = function(arg, cbEach, cbDone) {
    arg.path = '/users/me';
    fs.readFile('gowalla_me.json', function(err, data) {
        var me;
        try {
            if(err) throw "na";
            me = JSON.parse(data);
            if(!me || !me.url) throw "bad data";
        } catch (E) {
            return getOne(arg,function(err,me){
                if(!err)
                {
                    fs.writeFile('gowalla_me.json', JSON.stringify(me));
                    cbEach(me);
                }
                cbDone(err);
            });
        }
        // do these outside the try/catch incase they throw, then there'd be doubling, bad
        cbEach(me);
        cbDone();
    });
}

exports.getFriends = function(arg, cbEach, cbDone) {
    if(!arg.path) return cbDone("no user url");
    var me = this;
    arg.path += '/friends';
    arg.field = 'users';
    var friends = [];
    getPages(arg, function(f){friends.push(f)}, function(err){
        if(err) return cbDone(err);
        async.forEachSeries(friends, function(friend, cb){
            me.getUser({path:friend.url}, cbEach, cb);
        }, cbDone);
    });
}

exports.getUser = function(arg, cbEach, cbDone) {
    if(!arg.path) return cbDone("no user");
    getOne(arg, function(err, js){
        if(err) return cbDone(err);
        cbEach(js);
        cbDone();
    });
}

exports.getCheckins = function(arg, cbEach, cbDone) {
    if(!arg.path) return cbDone("no user url");
    arg.path += '/events';
    arg.field = 'activity';
    getPages(arg, cbEach, cbDone);
}

exports.getPins = function(arg, cbEach, cbDone) {
    if(!arg.path) return cbDone("no user url");
    arg.path += '/pins';
    arg.field = 'pins';
    getPages(arg, cbEach, cbDone);
}

function getOne(arg, cb)
{
    if(!arg.path) return cb("no path");
    var api = url.parse(base+arg.path);
    arg.oauth_token = auth.token.access_token;
    api.query = arg;
//    console.error(url.format(api));
    request.get({uri:url.format(api), json:true, headers:{"X-Gowalla-API-Key":auth.clientID, "Accept":"application/json"}}, function(err, resp, body) {
        if(err) return cb(err);
        if(!body) return cb("no body");
        setTimeout(function(){cb(null, body)}, 1000); // max 5/sec, and all synclets run at the same time
    });
}

function getPages(arg, cbEach, cbDone)
{
    if(!arg.field) return cbDone("missing field");
    if(!arg.page) arg.page = 1;
    getOne(arg, function(err, js){
        if(err) return cbDone(err);
        var arr = js[arg.field];
        if(!arr || !Array.isArray(arr) || arr.length == 0) return cbDone();
        for(var i = 0; i < arr.length; i++) cbEach(arr[i]);
        arg.page++;
        getPages(arg, cbEach, cbDone);
    });
}

