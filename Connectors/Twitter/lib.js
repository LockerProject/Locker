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


var tw;
var auth;

exports.init = function(theAuth) {
    auth = theAuth;
    tw = require('./twitter_client')(auth.consumerKey, auth.consumerSecret);
    try {
        fs.mkdirSync('friends', 0755);
    } catch(e) {};
};

exports.getMe = function(arg, cbEach, cbDone) {
    arg.path = '/account/verify_credentials.json';
    fs.readFile('twitter_me.json', function(err, data) {
        var me;
        try {
            if(err) throw "na";
            me = JSON.parse(data);
            if(!me || !me.screen_name) throw "bad data";
        } catch (E) {
            return getOne(arg,function(err,me){
                if(!err)
                {
                    fs.writeFile('twitter_me.json', JSON.stringify(me));
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

// walk my friends list getting/caching each one
exports.getMyFriends = function(arg, cbEach, cbDone) {
    var me = this;
    this.getMe({},function(js){arg.screen_name = js.screen_name;},function(err){
        if(err) return cbDone(err);
        arg.cursor=-1; // not sure why?
        arg.path = '/friends/ids.json';
        getOne(arg,function(err,js){
            if(err || !js.ids || js.ids.length == 0) return cbDone(err);
            me.getUsers(js.ids, function(friend){
                if(!friend) return;
                // load orig if any
                var orig;
                try {
                    orig = JSON.parse(fs.readFileSync('friends/'+friend.id_str+'.json'));
                }catch(E){}
                // background cache pic if it's new or changed
                if(!orig || orig.profile_image_url != friend.profile_image_url)
                {
                    request.get({uri:friend.profile_image_url, encoding:'binary'}, function(err, resp, body) {
                        var photoExt = friend.profile_image_url.substring(friend.profile_image_url.lastIndexOf('.'));
                        fs.writeFile('friends/' + friend.id_str + photoExt, body, 'binary');
                    });
                }
                // background cache data
                fs.writeFile('friends/'+friend.id_str+'.json', JSON.stringify(friend));
                cbEach(friend);
            },cbDone);
        });
    })
}

// just get extended details of all friends
exports.getFriends = function(arg, cbEach, cbDone) {
    if(!arg.screen_name) return cbDone("missing screen_name");
    var me = this;
    arg.cursor=-1; // not sure why?
    arg.path = '/friends/ids.json';
    getOne(arg,function(err,js){
        if(err || !js.ids || js.ids.length == 0) return cbDone(err);
        me.getUsers(js.ids, cbEach, cbDone);
    });
}


// just get extended details of all followers
exports.getFollowers = function(arg, cbEach, cbDone) {
    var me = this;
    arg.path = '/followers/ids.json';
    var q = async.queue(function(js,cb){ // use a queue to process each block of ids
        me.getUsers(js.ids, cbEach, cb);
    },1);
    getIdList(arg,q.push,function(err){
        if(err) return cbDone(err);
        if(q.length() == 0) return cbDone(); // queue could be done, but likely not
        q.drain = cbDone;
    });
}

// get your home timeline, screen_name has to be me
exports.getTimeline = function(arg, cbEach, cbDone) {
    if(!arg.screen_name) return cbDone("missing screen_name");
    arg.path = '/statuses/home_timeline.json';
    getPages(arg,cbEach,cbDone);
}

// get just one chunk of a timeline, screen_name has to be me
exports.getTimelinePage = function(arg, cbEach, cbDone) {
    if(!arg.screen_name) return cbDone("missing screen_name");
    if(!arg.count) arg.count = 100;
    arg.path = '/statuses/home_timeline.json';
    getOne(arg,function(err,js){
        if(js) cbEach(js);
        cbDone(err);
    });
}

// should work for anyone, get their tweets
exports.getTweets = function(arg, cbEach, cbDone) {
    if(!arg.screen_name) return cbDone("missing screen_name");
    arg.path = '/statuses/user_timeline.json';
    arg.include_rts = true;
    getPages(arg,cbEach,cbDone);
}

// duh
exports.getMentions = function(arg, cbEach, cbDone) {
    if(!arg.screen_name) return cbDone("missing screen_name");
    arg.path = '/statuses/mentions.json';
    getPages(arg,cbEach,cbDone);
}

// get replies and retweets for any tweet id
exports.getRelated = function(arg, cbEach, cbDone) {
    if(!arg.id) return cbDone("missing tweet id");
    getOne({path:"/related_results/show/"+arg.id+".json"},function(err,related){
        if(err || !Array.isArray(related)) return cbDone(err);
        getOne({path:"/statuses/"+arg.id+"/retweeted_by.json"},function(err,retweeted){
            if(err || !Array.isArray(retweeted)) return cbDone(err);
            if(retweeted.length > 0) related.push({results:retweeted,resultType:"ReTweet"});
            if(related.length > 0) cbEach(related);
            cbDone();
        });
    });
}

// step through any sized list of ids using cursors
function getIdList(arg, cbEach, cbDone) {
    if(!arg.screen_name) return cbDone("missing screen_name");
    var me = this;
    if(!arg.cursor) arg.cursor = -1;
    getOne(arg,function(err,js){
        if(err || !js.ids || js.ids.length == 0) return cbDone(err);
        cbEach(js);
        arg.cursor = js.next_cursor;
        if(arg.cursor == 0) return cbDone();
        me.getIdList(arg, cbEach, cbDone);
    });
}

// bulk chunk get user details
exports.getUsers = function(users, cbEach, cbDone) {
    if(users.length == 0) return cbDone();
    var lenStart = users.length;
    var me = this;
    var id_str = "";
    var ids = {};
    for(var i = 0; i < 100 && users.length > 0; i++) {
        id = users.pop();
        ids[id] = true; // track hash of all attempted
        if(i > 0) id_str += ',';
        id_str += id;
    }
    console.error("lookup "+users.length + " " + id_str);
    getOne({path:'/users/lookup.json',user_id:id_str},function(err,infos){
        if(err) return cbDone(err);
        console.error("checking "+JSON.stringify(infos));
        for(var i=0; i < infos.length; i++){
            if(!ids[infos[i].id_str]) continue; // skip dups
            delete ids[infos[i].id_str];
            cbEach(infos[i]);
        }
        for(id in ids){
            users.push(id); // any non-done users push back for next attempt
        }
        if(lenStart == users.length) return cbDone("failed to find remaining users");
        me.getUsers(users, cbEach, cbDone); // loop loop till done
    });
}

// call the api non-authenticated
function getOnePublic(arg, cb) {
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

function getOne(arg, cb) {
    if(!arg.path) return cb("no path");
    arg.token = auth.token;
    arg.include_entities = true;
    tw.apiCall('GET', arg.path, arg, function(err, js){
        if(err) return cb(err);
        cb(null,js);
    });
}

function getPages(arg, cbEach, cbDone) {
    if(!arg.path) return cb("no path");
    arg.count = 200;
    arg.token = auth.token;
    arg.include_entities = true;
    if(!arg.page) arg.page = 1;
    tw.apiCall('GET', arg.path, arg, function(err, js) {
        // if error.statusCode == 500, retry?
        if(err || !Array.isArray(js) || js.length == 0) return cbDone(err);
        for(var i = 0; i < js.length; i++) cbEach(js[i]);
        arg.page++;
        return getPages(arg,cbEach,cbDone);
    });
}

