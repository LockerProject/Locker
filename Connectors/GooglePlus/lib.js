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
    crypto = require("crypto"),
    sys = require('sys');

    
var auth;
var base = 'https://www.googleapis.com/plus/v1';

exports.init = function(theAuth) {
    auth = theAuth;
};

exports.getMe = function(arg, cbEach, cbDone) {
    arg.path = '/people/me';
    getOneAuth(arg,function(err,me){
        if(err || !me || !me.id) return cbDone(err);
    	cbEach(me);
        cbDone();
    });
}

exports.getActivities = function(arg, cbEach, cbDone) {
    arg.path = '/people/me/activities/public';
    arg.field = 'items';
    getPagesAuth(arg, cbEach, cbDone);
}


function getOneKey(arg, cb)
{
    arg.key = auth.consumerKey;
    getOne(arg, cb);
}

function getOneAuth(arg, cb)
{
    arg.access_token = auth.token.access_token;
    getOne(arg, cb);
}

function getOne(arg, cb)
{
    if(!arg.path) return cb("no path");
    var api = url.parse(base+arg.path);
    delete arg.path;
    api.query = arg;
    request.get({uri:url.format(api), json:true}, function(err, resp, js) {
        if(js) return cb(null, js);
        cb("couldn't understand reponse");
    });
}


function getPagesAuth(arg, cbEach, cbDone)
{
    if(!arg.path) return cbDone("no path");
    if(!arg.field) return cbDone("no field");
    if(!arg.maxresults) arg.maxresults = 100;
    arg.alt = 'json';
    arg.access_token = auth.token.access_token;
    var api = url.parse(base+arg.path);
    api.query = arg;
    request.get({uri:url.format(api), json:true}, function(err, resp, js) {
        if(err || !js) return cbDone(err);
        if(js.error) return cbDone(js.error);
        if(!Array.isArray(js[arg.field]) || js[arg.field].length == 0) return cbDone();
        for(var i = 0; i < js[arg.field].length; i++) cbEach(js[arg.field][i]);
        if(!js.nextPageToken || js[arg.field].length < arg.limit) return cbDone(); // at the end
        arg.pageToken = js.nextPageToken;
        return getPagesAuth(arg,cbEach,cbDone);
    });
}


