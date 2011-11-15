/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/*

available - all possible apps
installed - installed apps
install - npm install into Me/node_modules
publish - take meta-data + folder, create/update package.json (new version)
        if no auth, generate Me/registry.auth from keys
        use auth and publish new version

on startup
    scan Me/node_modules/X/package.json for all installed
    load cached available from Me/registry.json
        kick off process to look for newer
            merge in and re-write registry.json
            if newer of installed and update=auto, npm update
    schedule periodic update checks
*/

var npm = require('npm');
var fs = require('fs');
var path = require('path');
var async = require('async');
var request = require('request');
var semver = require('semver');
var lutil = require('lutil');
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
