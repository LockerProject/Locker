/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// all of the registry-related interactions

var npm = require('npm');
var fs = require('fs');
var path = require('path');
var async = require('async');
var request = require('request');
var semver = require('semver');
var lutil = require('lutil');
var lcrypto = require('lcrypto');
var lconfig;
var installed = {};
var regIndex = {};
var syncInterval = 3600000;
var syncTimer;
var regBase = 'http://registry.singly.com/';

// make sure stuff is ready/setup locally, load registry, start sync check, etc
exports.init = function(config, callback) {
    lconfig = config;
    try {
        fs.mkdirSync(path.join(lconfig.me, "node_modules"), 0755); // ensure a home in the Me space
    } catch(E) {}
    process.chdir(lconfig.me);
    loadInstalled(function(){
        npm.load({registry:regBase+'npm'}, function(err) {
            if(err) console.error(err);
            fs.readFile('registry.json', 'utf8', function(err, reg){
                try {
                    if(reg) regIndex = JSON.parse(reg);
                }catch(E){
                    console.error("couldn't parse registry.json: "+E);
                }
                syncTimer = setInterval(exports.sync, syncInterval);
                exports.sync();
                process.chdir(lconfig.lockerDir);
                callback(installed);
            });
        });
    });
};

// just load up any installed packages in node_modules
function loadInstalled(callback)
{
    var files = fs.readdirSync("node_modules");
    async.forEach(files, function(item, cb){
        var ppath = path.join('./node_modules/', item, 'package.json');
        fs.stat(ppath, function(err, stat){
            if(err || !stat || !stat.isFile()) return cb();
            loadPackage(item, cb);
        });
    }, callback);
}

// load an individual package
function loadPackage(name, callback)
{
    fs.readFile(path.join(lconfig.me, 'node_modules', name, 'package.json'), 'utf8', function(err, data){
        if(err || !data) return callback(err);
        try{
            var js = JSON.parse(data);
            if(!js.name) throw new Error("invalid package");
            installed[js.name] = js;
        }catch(E){
            console.error("couldn't parse "+name+"'s package.json: "+E);
            return callback();
        }
        request.get({uri:lconfig.lockerBase+'/map/upsert?manifest=Me/node_modules/'+name+'/package.json'}, callback);
    });
}

// background sync process to fetch/maintain the full package list
exports.sync = function()
{
    var startkey = 0;
    // get the newest
    Object.keys(regIndex).forEach(function(k){
        var mod = new Date(regIndex[k].time.modified).getTime();
        if(mod > startkey) startkey = mod;
    });
    // look for updated packages newer than the last we've seen
    var u = regBase+'npm/-/all/since?stale=update_after&startkey='+startkey;
    console.log("registry update from "+u);
    request.get({uri:u, json:true}, function(err, resp, body){
        if(err || !body || Object.keys(body).length === 0) return;
        // replace in-mem representation
        Object.keys(body).forEach(function(k){
            regIndex[k] = body[k];
            // if installed and autoupdated and newer, do it!
            if(installed[k] && body[k].update == 'auto' && semver.lt(installed[k].dist-tags.latest, body[k].dist-tags.latest))
            {
                console.log("auto-updating "+k+" to "+body[k].dist-tags.latest);
                exports.update({name:k}, function(){}); // lazy
            }
        });
        // cache to disk lazily
        lutil.atomicWriteFileSync(path.join(lconfig.me, 'registry.json'), JSON.stringify(regIndex));
    });
};

// share the data
exports.getInstalled = function() {
    return installed;
}
exports.getRegistry = function() {
    return regIndex;
}
exports.getPackage = function(name) {
    return regIndex[name];
}
exports.getViewers = function() {
    var viewers = [];
    Object.keys(regIndex).forEach(function(k){ if(regIndex[k].type === 'viewer') viewers.push(regIndex[k]); });
    return viewers;
}

// npm wrappers
exports.install = function(arg, callback) {
    if(!arg || !arg.name) return callback("missing package name");
    npm.commands.install([arg.name], function(){
        loadPackage(arg.name, callback); // once installed, load
    });
};
exports.update = function(arg, callback) {
    if(!arg || !arg.name) return callback("missing package name");
    npm.commands.update([arg.name], function(){
        loadPackage(arg.name, callback); // once updated, re-load
    });
};

// takes a dir, and publishes it as a package, initializing if needed
exports.publish = function(arg, callback) {
    if(!arg || !arg.dir) return callback("missing base dir");
    var pjs = path.join(arg.dir, "package.json");
    // first, required github
    github(function(gh){
        if(!gh) return callback("github account is required");
        // next, required registry auth
        regUser(gh, function(err, auth){
            if(err ||!auth || !auth._auth) return callback(err);
            npm.config.set("_auth", auth._auth); // saves for publish
            // make sure there's a package.json
            checkPackage(pjs, arg, gh, function(){
                // bump version
                npm.commands.version(["patch"], function(){
                    // finally !!!
                    npm.commands.publish([arg.dir], function(){
                        calback();
                    })
                });
            });
        });
    })
};

// make sure a package.json exists, or create one
function checkPackage(pjs, arg, gh, callback)
{
    fs.stat(pjs, function(err, stat){
        if(err || !stat || !stat.isFile())
        {
            var pkg = path.basename(path.dirname(pjs));
            var js = {
              "author": gh.name,
              "name": gh.login + "-" + pkg,
              "description": arg.description || "auto generated",
              "version": "0.0.0",
              "type":
              "repository": {
                "title": arg.title || "blank";
                "handle": "reg-" + gh.login + "-" + pkg,
                "type": "viewer",
                "author": gh.name,
                "viewer": arg.viewer,
                "static": true
                "url": "http://github.com/"+gh.login+"/"+pkg
              },
              "dependencies": {},
              "devDependencies": {}
            };
            lutil.atomicWriteFileSync(pjs, JSON.stringify(js));
        }
        return callback();
    });
}

// return authenticated user, or create/init them
function regUser(gh, callback)
{
    fs.readFile(path.join(lconfig.me, 'registry_auth.json'), 'utf8', function(err, auth){
        var js;
        try { js = JSON.parse(auth); }catch(E){}
        if(js) return callback(false, js);
        var pw = lcrypto.encrypt(gh.email); // we just need something locally regenerable
        // try creating this user on the registry
        adduser(gh.login, pw, gh.email, function(err, resp, body){
            // TODO, is 200 and 409 both valid?
            js = {_auth:base64.encode(gh.login+":"+pw), username:gh.login};
            lutil.atomicWriteFileSync(path.join(lconfig.me, 'registry_auth.json'), JSON.stringify(js));
            callback(false, js);
        });
    });
}

// fetch and cache the connected github account profile
var ghprofile;
function github(callback)
{
    if(ghprofile) return callback(ghprofile);
    request.get({uri:lconfig.lockerBase+'/Me/github/getCurrent/profile', json:true}, function(err, resp, body){
        if(err || !body || !body.login) return callback();
        ghprofile = body;
        callback(ghprofile);
    });
}

// copied and modified from npm/lib/utils/registry/adduser.js
function adduser (username, password, email, cb) {
  if (password.indexOf(":") !== -1) return cb(new Error(
    "Sorry, ':' chars are not allowed in passwords.\n"+
    "See <https://issues.apache.org/jira/browse/COUCHDB-969> for why."))
  var salt = ""
    , userobj =
      { name : username
      , salt : salt
      , password_sha : sha(password + salt)
      , email : email
      , _id : 'org.couchdb.user:'+username
      , type : "user"
      , roles : []
      }
  request.PUT({uri:regBase+'npm/-/user/org.couchdb.user:'+encodeURIComponent(username), json:true, body:userobj}, cb);
}