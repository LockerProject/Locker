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

    
var tumblr;
var auth;
var base = 'http://api.tumblr.com/v2';

exports.init = function(theAuth) {
    auth = theAuth;
    tumblr = require('./tumblr_client')(auth.consumerKey, auth.consumerSecret);
};

exports.getMe = function(arg, cbEach, cbDone) {
    arg.path = '/user/info';
    getOne(arg,function(err,me){
        if(err || !me || !me.user) return cbDone(err);
        // do this for convenience
        for(var i in me.user.blogs){
    	    if(!me.user.blogs[i].primary) continue;
    	    var u = url.parse(me.user.blogs[i].url);
    	    if(u && u.hostname) me.host = u.hostname;
    	    break;
    	}
    	cbEach(me);
        cbDone();
    });
}

// call the api non-authenticated
function getOnePublic(arg, cb)
{
    if(!arg.path) return cb("no path");
    var api = url.parse('https://api.twitter.com/1'+arg.path);
    delete arg.path;
    api.query = arg;
    request.get({uri:url.format(api)}, function(err, resp, body) {
        var js;
        try{
            if(err) throw err;
            js = JSON.parse(body);
        }catch(E){
            return cb(E);
        }
        cb(null,js);
    });
}

function getOneKey(arg, cb)
{
    if(!arg.path) return cb("no path");
    arg.api_key = auth.consumerKey;
    tumblr.apiCall('GET', arg.path, arg, function(err, js){
        if(err) return cb(err);
        cb(null,js);
    });
}

function getOne(arg, cb)
{
    if(!arg.path) return cb("no path");
    arg.token = auth.token;
    tumblr.apiCall('GET', arg.path, arg, function(err, js){
        if(!err && js && js.meta && js.meta.status === 200 && js.response) return cb(null, js.response);
        cb(err);
    });
}

function getPages(arg, cbEach, cbDone)
{
    if(!arg.path) return cb("no path");
    arg.token = auth.token;
    arg.include_entities = true;
    if(!arg.page) arg.page = 1;
    tw.apiCall('GET', arg.path, arg, function(err, js){
        // if error.statusCode == 500, retry?
        if(err || !Array.isArray(js) || js.length == 0) return cbDone(err);
        for(var i = 0; i < js.length; i++) cbEach(js[i]);
        arg.page++;
        return getPages(arg,cbEach,cbDone);
    });
}

