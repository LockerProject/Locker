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
    sys = require('sys');

    
var auth;

// enumeration of all fields on a user for open graph, cuz they're not all default
var allUserFields = "id,name,first_name,middle_name,last_name,gender,locale,languages,link,username,third_party_id,timezone,updated_time,verified,bio,birthday,education,email,hometown,interested_in,location,political,favorite_athletes,favorite_teams,quotes,relationship_status,religion,significant_other,video_upload_limits,website,work";

exports.init = function(theAuth) {
    auth = theAuth;
    try {
        fs.mkdirSync('people', 0755);
        fs.mkdirSync('posts', 0755);
        fs.mkdirSync('photos', 0755);
    }catch(e){};
};

// walk a friends list getting/caching each one
exports.getFriends = function(arg, cbEach, cbDone) {
    var fb = this;
    var uri = 'https://graph.facebook.com/'+arg.id+'/friends?access_token=' + auth.accessToken + '&date_format=U';
    getOne(uri,function(err,friends){
        if(err || !friends.data) return cbDone(err);
        async.forEach(friends.data,function(friend,cb){
            fb.getPerson({id:friend.id},cbEach,cb);
        },cbDone);
    });
}

// get as much as we can about any single person, including caching their thumbnail
exports.getPerson = function(arg, cbEach, cbDone) {
    // should check cache here of people/id.json and just use that if it's recent enough
    var uri = 'https://graph.facebook.com/'+arg.id+'?access_token=' + auth.accessToken + '&date_format=U&fields='+allUserFields;
    getOne(uri,function(err,js){
        if(err) return cbDone(err);
        // background cache pic
        request.get({uri:'https://graph.facebook.com/' + arg.id + '/picture?access_token=' + auth.accessToken, encoding:'binary'}, function(err, resp, body) {
                var ct = resp.headers['content-type'];
                var photoExt = ct.substring(ct.lastIndexOf('/')+1);
                fs.writeFile('people/' + arg.id + "." + photoExt, body, 'binary');
        });
        // background cache data
        fs.writeFile('people/'+arg.id+'.json', JSON.stringify(js));
        cbEach(js);
        cbDone();
    });
}

// recurse getting all the photos in an album
exports.getAlbum = function (arg, cbEach, cbDone) {
    var uri = (arg.page)?arg.page:'https://graph.facebook.com/'+arg.id+'/photos?access_token=' + auth.accessToken + '&date_format=U';
    getDatas(uri, cbEach, cbDone);
}

// recurse getting all the albums for a person
exports.getAlbums = function (arg, cbEach, cbDone) {
    var uri = (arg.page)?arg.page:'https://graph.facebook.com/'+arg.id+'/albums?access_token=' + auth.accessToken + '&date_format=U';
    getDatas(uri, cbEach, cbDone);
}

// recurse getting all the photos tagged in
exports.getTagged = function (arg, cbEach, cbDone) {
    var uri = (arg.page)?arg.page:'https://graph.facebook.com/'+arg.id+'/photos?access_token=' + auth.accessToken + '&date_format=U';
    getDatas(uri, cbEach, cbDone);
}

// get photo data and thumb/source
exports.getPhoto = function(arg, cbEach, cbDone) {
    // should check cache here for sure
    var uri = 'https://graph.facebook.com/'+arg.id+'?access_token=' + auth.accessToken + '&date_format=U';
    getOne(uri,function(err,js){
        if(err) return cbDone(err);
        async.parallel([
            function(cb){
                fs.writeFile('photos/'+arg.id+'.json', JSON.stringify(js),cb);
            },function(cb){
                if(!js.picture) return cb("no .picture");
                request.get({uri:js.picture, encoding:'binary'}, function(err, resp, body) {
                        var ct = resp.headers['content-type'];
                        var photoExt = ct.substring(ct.lastIndexOf('/')+1);
                        fs.writeFile('photos/' + arg.id + "-thumb." + photoExt, body, 'binary',cb);
                });
            },function(cb){
                if(!js.source) return cb("no .source");
                request.get({uri:js.source, encoding:'binary'}, function(err, resp, body) {
                        var ct = resp.headers['content-type'];
                        var photoExt = ct.substring(ct.lastIndexOf('/')+1);
                        fs.writeFile('photos/' + arg.id + "-orig." + photoExt, body, 'binary',cb);
                });
            }],function(err){
            if(!err) cbEach(js);
            cbDone(err);
        });
    });
}

// recurse getting all the posts for a person and type (wall or newsfeed) {id:'me',type:'home',since:123456789}
exports.getPosts = function (arg, cbEach, cbDone) {
    var since = (arg.since)?"&since="+arg.since:"";
    var uri = (arg.page)?arg.page:'https://graph.facebook.com/'+arg.id+'/'+arg.type+'?access_token=' + auth.accessToken + '&date_format=U'+since;
    getDatas(uri, cbEach, cbDone);
}

function getOne(uri, cb)
{
    if(!uri) return cb("no uri");
    request.get({uri:uri}, function(err, resp, body){
        var js;
        try{
            if(err) throw err;
            js = JSON.parse(body);
        }catch(e){
            return cb(e);
        }
        cb(null,js);
    });
}

function getDatas(uri, cbEach, cbDone)
{
    if(!uri) return cbDone("no uri");
    request.get({uri:uri}, function(err, resp, body){
        var js;
        try{
            if(err) throw err;
            js = JSON.parse(body);
        }catch(e){
            return cbDone(e);
        }
        for(var i = 0; js.data && i < js.data.length; i++) cbEach(js.data[i]);
        if(js.paging && js.paging.next)
        {
            getDatas(js.paging.next,cbEach,cbDone);
        }else{
            cbDone();
        }
    });
}

