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
var lconfig;
var installed = {};

var conf = {registry:'http://registry.singly.com/npm'};

exports.init = function(config, callback) {
    lconfig = config;
    try {
        fs.mkdirSync(path.join(lconfig.me, "node_modules"), 0755); // ensure a home in the Me space        
    } catch(E) {}
    process.chdir(lconfig.me);
    loadInstalled(function(){
        npm.load(conf, function(err) {
            process.chdir(lconfig.lockerDir);
            if(err) console.error(err);
            callback(installed);
        });        
    });
};

// just load up any installed packages in node_modules
function loadInstalled(callback)
{
    var files = fs.readdirSync("node_modules");
    async.forEach(files, function(file, cb){
        var ppath = path.join('./node_modules/', file, 'package.json');
        fs.stat(ppath, function(err, stat){
            if(err || !stat || !stat.isFile()) return cb();
            fs.readFile(ppath, function(err, data){
                if(err || !data) return cb();
                try{
                    var js = JSON.parse(data);
                    if(!js.name) throw new Error("invalid package");
                    installed[js.name] = js;
                }catch(E){
                    console.error("couldn't parse "+ppath+": "+E);
                }
                cb();
            });
        });
    }, callback);
}

exports.install = function(arg, callback) {
    if(!arg || !arg.name) return callback("missing package name");
    npm.commands.install([arg.name], callback);
};

exports.update = function(arg, callback) {
    if(!arg || !arg.name) return callback("missing package name");
    npm.commands.update([arg.name], callback);
};
