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
var crypto = require("crypto");
var lutil = require('lutil');
var logger = require('logger').logger;
var lconfig;
var lcrypto;
var installed = {};
var regIndex = {};
var syncInterval = 3600000;
var syncTimer;
var regBase = 'http://registry.singly.com';

// make sure stuff is ready/setup locally, load registry, start sync check, etc
exports.init = function(config, crypto, callback) {
    lconfig = config;
    lcrypto = crypto;
    try {
        fs.mkdirSync(path.join(lconfig.lockerDir, lconfig.me, "node_modules"), 0755); // ensure a home in the Me space
    } catch(E) {}
    loadInstalled(function(err){
        if(err) logger.error(err);
        // janky stuff to make npm run isolated fully
        var home = path.join(lconfig.lockerDir, lconfig.me);
        process.chdir(home);
        var config = {registry:regBase, cache:path.join(home, '.npm')};
        npm.load(config, function(err) {
            if(err) logger.error(err);
            fs.readFile('registry.json', 'utf8', function(err, reg){
                try {
                    if(reg) regIndex = JSON.parse(reg);
                }catch(E){
                    logger.error("couldn't parse registry.json: "+E);
                }
                syncTimer = setInterval(exports.sync, syncInterval);
                exports.sync();
                process.chdir(lconfig.lockerDir);
                callback(installed);
            });
        });
    });
};

// init web endpoints
exports.app = function(app)
{
    app.get('/registry/added', function(req, res) {
        res.send(exports.getInstalled());
    });
    app.get('/registry/add/:id', function(req, res) {
        logger.info("registry trying to add "+req.params.id);
        if(!regIndex[req.params.id]) return res.send("not found", 404);
        if(!verify(regIndex[req.params.id])) return res.send("invalid app", 500);
        exports.install({name:req.params.id}, function(){ res.send(true); });
    });
    app.get('/registry/apps', function(req, res) {
        res.send(exports.getApps());
    });
    app.get('/registry/all', function(req, res) {
        res.send(exports.getRegistry());
    });
    app.get('/registry/app/:id', function(req, res) {
        var id = req.params.id;
        if(!regIndex[id]) return res.send("not found", 404);
        var copy = lutil.extend(true, {}, regIndex[id]);
        copy.installed = installed[id];
        res.send(copy);
    });
    app.get('/registry/sync', function(req, res) {
        logger.info("manual registry sync");
        exports.sync(function(){res.send(true)});
    });
    // takes the local github id format, user-repo
    app.get('/registry/publish/:id', function(req, res) {
        logger.info("registry publishing "+req.params.id);
        var id = req.params.id;
        if(id.indexOf("-") <= 0) return res.send("not found", 404);
        if(id.indexOf("..") >= 0 || id.indexOf("/") >= 0) return res.send("invalid id characters", 500)
        id = id.replace("-","/");
        var dir = path.join(lconfig.lockerDir, lconfig.me, 'github', id);
        fs.stat(dir, function(err, stat){
            if(err || !stat || !stat.isDirectory()) return res.send("invalid id", 500);
            var args = req.query || {};
            args.dir = dir;
            exports.publish(args, function(err, doc){
                if(err) res.send(err, 500);
                res.send(doc);
            });
        });
    });
}

// verify the validity of a package
function verify(pkg)
{
    if(!pkg) return false;
    if(!pkg.repository) return false;
    if(!pkg.repository.static) return false;
    if(pkg.repository.static === true || pkg.repository.static === "true") return true;
    return false;
}

// just load up any installed packages in node_modules
function loadInstalled(callback)
{
    var files = fs.readdirSync(path.join(lconfig.lockerDir, lconfig.me, "node_modules"));
    async.forEach(files, function(item, cb){
        var ppath = path.join(lconfig.lockerDir, lconfig.me, 'node_modules', item, 'package.json');
        fs.stat(ppath, function(err, stat){
            if(err || !stat || !stat.isFile()) return cb();
            loadPackage(item, function(){cb()}); // ignore individual errors
        });
    }, callback);
}

// load an individual package
function loadPackage(name, callback)
{
    fs.readFile(path.join(lconfig.lockerDir, lconfig.me, 'node_modules', name, 'package.json'), 'utf8', function(err, data){
        if(err || !data) return callback(err);
        try{
            var js = JSON.parse(data);
            if(js.name != name) throw new Error("invalid package");
            installed[js.name] = js;
        }catch(E){
            logger.error("couldn't parse "+name+"'s package.json: "+E);
            return callback(E);
        }
        request.get({uri:lconfig.lockerBase+'/map/upsert?manifest='+path.join('Me/node_modules',name,'package.json')}, function(){
             callback(null, installed[name]);
        });
    });
}

// background sync process to fetch/maintain the full package list
exports.sync = function(callback)
{
    var startkey = 0;
    // get the newest
    Object.keys(regIndex).forEach(function(k){
        if(!regIndex[k].time || !regIndex[k].time.modified) return;
        var mod = new Date(regIndex[k].time.modified).getTime();
        if(mod > startkey) startkey = mod;
    });
    // look for updated packages newer than the last we've seen
    startkey++;
    var u = regBase+'/-/all/since?stale=update_after&startkey='+startkey;
    logger.info("registry update from "+u);
    request.get({uri:u, json:true}, function(err, resp, body){
        if(err || !body || Object.keys(body).length === 0) return callback ? callback() : "";
        // replace in-mem representation
        Object.keys(body).forEach(function(k){
            logger.verbose("new "+k+" "+body[k]["dist-tags"].latest);
            regIndex[k] = body[k];
            // if installed and autoupdated and newer, do it!
            if(installed[k] && body[k].repository && body[k].repository.update == 'auto' && semver.lt(installed[k].version, body[k]["dist-tags"].latest))
            {
                logger.verbose("auto-updating "+k);
                exports.update({name:k}, function(){}); // lazy
            }
        });
        // cache to disk lazily
        lutil.atomicWriteFileSync(path.join(lconfig.lockerDir, lconfig.me, 'registry.json'), JSON.stringify(regIndex));
        if(callback) callback();
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
exports.getApps = function() {
    var apps = {};
    Object.keys(regIndex).forEach(function(k){ if(regIndex[k].repository && regIndex[k].repository.type === 'app') apps[k] = regIndex[k]; });
    return apps;
}

// npm wrappers
exports.install = function(arg, callback) {
    if(!arg || !arg.name) return callback("missing package name");
    npm.commands.install([arg.name], function(err){
        if(err){
            if(!arg.retry) arg.retry=0;
            arg.retry++;
            logger.warn("retry "+arg.retry+": "+err);
            if(arg.retry < 3) return setTimeout(function(){exports.install(arg, callback);}, 1000);
        }
        loadPackage(arg.name, callback); // once installed, load
    });
};
exports.update = function(arg, callback) {
    if(!arg || !arg.name) return callback("missing package name");
    npm.commands.update([arg.name], function(err){
        if(err) logger.error(err);
        loadPackage(arg.name, callback); // once updated, re-load
    });
};

// takes a dir, and publishes it as a package, initializing if needed
exports.publish = function(arg, callback) {
    if(!arg || !arg.dir) return callback("missing base dir");
    var pjs = path.join(arg.dir, "package.json");
    logger.info("publishing "+pjs);
    // first, required github
    github(function(gh){
        if(!gh) return callback("github account is required");
        // next, required registry auth
        regUser(gh, function(err, auth){
            if(err ||!auth || !auth._auth) return callback(err);
            // saves for publish auth and maintainer
            npm.config.set("username", gh.login);
            npm.config.set("email", gh.email);
            npm.config.set("_auth", auth._auth);
            // make sure there's a package.json
            checkPackage(pjs, arg, gh, function(){
                // bump version
                process.chdir(arg.dir); // this must be run in the package dir, grr
                npm.commands.version(["patch"], function(err){
                    process.chdir(lconfig.lockerDir); // restore
                    if(err) return callback(err);
                    // finally !!!
                    npm.commands.publish([arg.dir], function(err){
                        if(err) return callback(err);
                        var updated = JSON.parse(fs.readFileSync(pjs));
                        regIndex[updated.name] = updated; // shim it in, sync will replace it eventually too just to be sure
                        callback(null, updated);
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
            var handle = ("app-" + gh.login + "-" + pkg).toLowerCase();
            var js = {
              "author": { "name": gh.name },
              "name": handle,
              "description": arg.description || "auto generated",
              "version": "0.0.0",
              "repository": {
                "title": arg.title || pkg,
                "handle": handle,
                "type": "app",
                "author": gh.name,
                "static": "true",
                "update": "auto",
                "url": "http://github.com/"+gh.login+"/"+pkg
              },
              "dependencies": {},
              "devDependencies": {},
              "engines": {"node": "*"}
            };
            lutil.atomicWriteFileSync(pjs, JSON.stringify(js));
        }
        return callback();
    });
}

// return authenticated user, or create/init them
function regUser(gh, callback)
{
    fs.readFile(path.join(lconfig.lockerDir, lconfig.me, 'registry_auth.json'), 'utf8', function(err, auth){
        var js;
        try { js = JSON.parse(auth); }catch(E){}
        if(js) return callback(false, js);
        var pw = lcrypto.encrypt(gh.email); // we just need something locally regenerable
        // try creating this user on the registry
        adduser(gh.login, pw, gh.email, function(err, resp, body){
            // TODO, is 200 and 409 both valid?
            logger.error(err);
            logger.error(resp);
            js = {_auth:(new Buffer(gh.login+":"+pw,"ascii").toString("base64")), username:gh.login};
            lutil.atomicWriteFileSync(path.join(lconfig.lockerDir, lconfig.me, 'registry_auth.json'), JSON.stringify(js));
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
        if(err || !body || body.length != 1 || !body[0].login) return callback();
        ghprofile = body[0];
        callback(ghprofile);
    });
}

// copied and modified from npm/lib/utils/registry/adduser.js
function adduser (username, password, email, cb) {
  if (password.indexOf(":") !== -1) return cb(new Error(
    "Sorry, ':' chars are not allowed in passwords.\n"+
    "See <https://issues.apache.org/jira/browse/COUCHDB-969> for why."))
  var salt = "na"
    , userobj =
      { name : username
      , salt : salt
      , password_sha : crypto.createHash("sha1").update(password+salt).digest("hex")
      , email : email
      , _id : 'org.couchdb.user:'+username
      , type : "user"
      , roles : []
      , date: new Date().toISOString()
      }
      logger.info("adding user "+JSON.stringify(userobj));
  request.put({uri:regBase+'/-/user/org.couchdb.user:'+encodeURIComponent(username), json:true, body:userobj}, cb);
}