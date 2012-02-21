/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// all of the registry-related interactions

// npm likes to reset process.title for some reason
var savedProcessTitle = process.title;
var npm = require('npm');
process.title = savedProcessTitle;

var fs = require('fs');
var path = require('path');
var async = require('async');
var request = require('request');
var semver = require('semver');
var crypto = require("crypto");
var lutil = require('lutil');
var express = require('express');
var querystring = require('querystring');
var logger;
var lconfig;
var lcrypto;
var syncInterval = 3600000;
var syncTimer;
var regBase = 'http://registry.singly.com';
var burrowBase = "https://burrow.singly.com";
var serviceManager, syncManager;
var apiKeys;

// make sure stuff is ready/setup locally, load registry, start sync check, etc
exports.init = function (serman, syncman, config, crypto, callback) {
    serviceManager = serman;
    syncManager = syncman;
    lconfig = config;
    apiKeys = JSON.parse(fs.readFileSync(lconfig.lockerDir + "/Config/apikeys.json", 'utf-8'));
    logger = require('logger');
    lcrypto = crypto;
    try {
        fs.mkdirSync(path.join(lconfig.lockerDir, lconfig.me, "node_modules"), 0755); // ensure a home in the Me space
    } catch(E) {}
    config = {registry:regBase, cache:path.join(home, '.npm')};
    config.locker_me = path.join(lconfig.lockerDir, lconfig.me);
    config.locker_base = lconfig.lockerBase;
    var home = path.join(lconfig.lockerDir, lconfig.me);
    process.chdir(home); // for npm
    npm.load(config, function (err) {
        process.chdir(lconfig.lockerDir); // restore
        if (err) logger.error(err);
        exports.sync();
        callback();
    });
};

// init web endpoints
exports.app = function (app) {
    app.get('/registry/add/:id', addApp);

// TODO make sure callers understand response format!
    app.get("/registry/connectors", getConnectors);

    app.get('/registry/app/:id', function (req, res) {
        getPackage(req.params.id, function(err, pkg){
            if(err || !pkg)
            {
                logger.error("couldn't get "+req.params.id+": ",err);
                return res.send(err, 404);
            }
            res.send(pkg);
        });
    });
    app.get('/registry/sync', function (req, res) {
        logger.info("manual registry sync");
        exports.sync(function (err) {
            if (err) return res.send(err, 500);
            res.send(true);
        }, req.param('force'));
    });
    // takes the local github id format, user-repo
    app.get('/registry/publish/:id', publishPackage);

    app.post('/registry/publish/:id', express.bodyParser(), publishPackage);

    app.put("/registry/screenshot/:id", publishScreenshot);
    app.get("/registry/screenshot/:id", function(req, res) {
        res.redirect(burrowBase + "/registry/" + req.params.id + "/screenshot.png");
    });

    app.get('/auth/:id', authIsAwesome);
    app.get('/auth/:id/auth', authIsAuth);

    app.get('/deauth/:id', deauthIsAwesomer);
};

function getConnectors(req, res) {
    var connectors = {};
    // get all connectors from the registry
    var url = burrowBase + "/registry/_design/connectors/_view/Connectors";
    request.get({uri:url, json:true}, function(err, res, js){
        if(js && js.rows) js.rows.forEach(function(conn){
            // if api key
            if(apiKeys[conn.id]) connectors[conn.id] = conn.value;
            // if no key required
            if(conn.value.keys === false || conn.value.keys == "false") connectors[conn.id] = conn.value;
        });
        // annoyingly, some might be local only
        Object.keys(serviceManager.map()).forEach(function(key) {
            var svc = serviceManager.map(key);
            if(svc.type != "connector") return;
            if(connectors[key]) return;
            if(apiKeys[key]) connectors[key] = svc;
        });
        var arr = [];
        Object.keys(connectors).forEach(function(k){arr.push(connectors[k])});
        res.send(arr);
    });
}

function addApp(req, res) {
    if (!req.params.id) return res.send('invalid id', 400);
    logger.info("registry trying to add "+req.params.id);
    getPackage(req.params.id, function(err, pkg){
        if(err || !pkg)
        {
            logger.error(req.params.id+" failed: ",err);
            return res.send(err, 500);
        }
        if(!verifyPkg(pkg))
        {
            logger.error(req.params.id+" not valid ");
            return res.send("not valid", 500);
        }
        exports.install(pkg, function (err) {
            if (err) return res.send(err, 500);
            res.send(true);
        });
    });
}

function publishPackage(req, res) {
    logger.info("registry publishing "+req.params.id);
    var id = req.params.id;
    var svc = serviceManager.map(id);
    if(!svc || !svc.srcdir) return res.send("not found in map", 400);
    var dir = svc.srcdir;
    if (!dir || dir.indexOf('Me/github/') !== 0) return res.send("package path not valid", 400);
    fs.stat(dir, function (err, stat) {
        if (err || !stat || !stat.isDirectory()) return res.send("invalid id", 400);
        var args = {};
        args.dir = dir;
        args.id = id;
        exports.publish(args, function (err, doc, issue) {
            if (err) logger.error(err);
            res.json({err:(err && typeof(err) == "object" && err.message ? err.message : err), doc:doc, issue:issue});
        });
    });
}

function publishScreenshot(req, res) {
    if (!req.params.id) return res.send('id undefined', 400);
    // TODO: This should really use streams, but it's not letting us.
    var buffer = new Buffer(Number(req.headers["content-length"]), "binary");
    var offset = 0;
    req.on("data", function (data) {
        data.copy(buffer, offset, 0, data.length);
        offset += data.length;
    });
    req.on("end", function () {
        // first, required github
        regUser(function (err, auth) {
            if (err ||!auth || !auth._auth) {
                res.send(err, 400);
                return;
            }
            logger.log("info", "Publising the screenshot for " + req.params.id);
            request.get({uri:burrowBase + "/registry/" + req.params.id, json:true}, function (err, result, body) {
                if (err) {
                    logger.log("error", "Tried to publish a screenshot to nonexistent package " + req.params.id);
                    res.send(err, 400);
                    return;
                }
                var putReq = request.put(
                    {
                        url:burrowBase + "/registry/" + req.params.id + "/screenshot.png?rev=" + body._rev ,
                        headers:{"Content-Type":"image/png", Authorization:"Basic " + auth._auth, "Content-Length":req.headers["content-length"]},
                        body:buffer
                    },
                    function (putErr, putResult, putBody) {
                        if (putErr) {
                            logger.error("error", "Error uploading the screenshot: " + putErr);
                            return res.send(putErr, 400);
                        }
                        logger.info("Registry done sending screenshot");
                        res.send(200);
                    }
                );
                //req.pipe(putReq);
                /*
                putReq.on("error", function (err) {
                    res.send(400, err);
                });
                putReq.on("end", function () {
                    res.send(200);
                });
                putReq.on("data", function (data) {
                    console.log("registry: " + data);
                });
                req.on("data", function () {
                    console.log("read some data for the registry");
                });
                */
            });
        });
    });
}

// verify the validity of a package
function verifyPkg(pkg) {
    if (!pkg) return false;
    if (!pkg.signed) return false;
    if (!pkg.repository) return false;
    if (pkg.repository.type == 'app') return true;
    if (pkg.repository.type == 'connector') return true;
    if (pkg.repository.type == 'collection') return true;
    return false;
}

// background sync process to fetch/maintain the full installed package list, auto-update
var syncCallbacks = [];
exports.sync = function (callback, force) {
    if (!callback) callback = function (err) {
        if (err) logger.error(err);
    }; // callback is required
    syncCallbacks.push(callback);

    // if we're syncing already, bail
    if (syncCallbacks.length > 1) return;


    function finish(err) {
        if(err) logger.error(err);
        syncTimer = setTimeout(exports.sync, syncInterval);
        syncCallbacks.forEach(function (cb) { cb(err); });
        syncCallbacks = [];
    }

    if (syncTimer) clearTimeout(syncTimer);

    // always good to refresh this too!
    apiKeys = JSON.parse(fs.readFileSync(lconfig.lockerDir + "/Config/apikeys.json", 'utf-8'));

    async.forEach(Object.keys(serviceManager.map()), function(key, cb) {
        var svc = serviceManager.map(key);
        if(svc.srcdir.indexOf("/node_modules/") == -1) return cb();
        getPackage(key, function(err, pkg){
            if(err || !pkg) logger.error(err); // log is only helpful here, not stopper
            if(pkg.signed) updatePkg(pkg); // happens async
            cb();
        });
    }, finish);
};

// check a specific version if it's signed, sets pkg.signed=true||false and passes through!
function checkSigned(pkg, callback) {
    if(!pkg) return callback("missing package");
    pkg.signed = false;
    // if no sig required just pass through
    if (!lconfig.requireSigned) {
        pkg.signed = true;
        return callback(null, pkg);
    }
    var url = burrowBase + "/registry/" + pkg.name + "/signature-"+pkg.version;
    logger.verbose("fetching "+url);
    request.get({uri:url, json:true, headers:{"Connection":"keep-alive"}}, function (err, resp, body) {
        if (err || !body || !body.sig) return callback(null, pkg);
        var data = pkg.dist.shasum + " " + path.basename(pkg.dist.tarball);
        if (!lcrypto.verify(data, body.sig, lconfig.keys)) {
            logger.error(data + " signature failed verification :(");
            return callback(null, pkg);
        }
        pkg.signed = true;
        return callback(null, pkg);
    });
}

// update to this pkg if it's newer
function updatePkg(pkg) {
    logger.verbose("new "+pkg.name+" "+pkg.version);
    if (lconfig.registryUpdate === true &&
        serviceManager.map(pkg.name) &&
        pkg.repository &&
        (pkg.repository.update == 'auto' ||
         pkg.repository.update == 'true' ||
         pkg.repository.update === true) &&
        semver.lt(serviceManager.map(pkg.name).version, pkg.version)) {
        if (serviceManager.map(pkg.name).srcdir.indexOf("node_modules") == -1) {
            logger.verbose("skipping since local versionis not from the registry");
        } else {
            logger.verbose("auto-updating "+pkg.name);
            exports.install({name:pkg.name}, function (err) {
                if (err) logger.error(err);
            }); // lazy update
        }
    }else{
        logger.verbose("missing or not auto-update");
    }
}

// simple wrapper to get any package info from registry
function getPackage(name, callback) {
    var tag = (lconfig.requireSigned) ? "signed" : "latest";
    var url = regBase + "/" + name + "/" + tag;
    logger.verbose("fetching "+url);
    request.get({uri:url, json:true, headers:{"Connection":"keep-alive"}}, function(err, res, js){
        if(err || !res) return callback(err);
        if(!js || js.name != name) return callback("missing body");
        js.installed = (serviceManager.map(name)) ? true : false;
        return checkSigned(js, callback);
    });
};

// npm wrappers
exports.install = function (arg, callback) {
    if (!arg || !arg.name || !arg.version) return callback("missing package info");
    var npmarg = [];

    if (serviceManager.map(arg.name) && serviceManager.map(arg.name).version == arg.latest) return callback(null, serviceManager.map(arg.name)); // in the map already
    npmarg = [arg.name+'@'+arg.version];
    logger.info("installing "+JSON.stringify(npmarg));
    npm.commands.install(npmarg, function (err) {
        if (err) { // some errors appear to be transient
            if (!arg.retry) arg.retry=0;
            arg.retry++;
            logger.warn("retry "+arg.retry+": "+err);
            if (arg.retry < 3) return setTimeout(function () {exports.install(arg, callback);}, 1000);
            return callback(err);
        }
        var ppath = path.join(lconfig.me, 'node_modules', arg.name, 'package.json');
        var up = serviceManager.mapUpsert(ppath);
        if (!up) callback("upsert failed");
        callback(null, up);
    });
};

// takes a dir, and publishes it as a package, initializing if needed
exports.publish = function (arg, callback) {
    if (!arg || !arg.dir) return callback("missing base dir");
    var pjs = path.join(arg.dir, "package.json");
    logger.info("attempting to publish "+pjs);
    // first, required github
    github(function (gh) {
        if (!gh) return callback("github account is required");
        // next, required registry auth
        regUser(function (err, auth) {
            if (err ||!auth || !auth._auth) return callback(err);
            // saves for publish auth and maintainer
            npm.config.set("username", auth.username);
            npm.config.set("email", auth.email);
            npm.config.set("_auth", auth._auth);
            // make sure there's a package.json
            checkPackage(pjs, arg, gh, function (err) {
                if (err) return callback(err);
                // bump version
                process.chdir(arg.dir); // this must be run in the package dir, grr
                npm.commands.version(["patch"], function (err) {
                    process.chdir(lconfig.lockerDir); // restore
                    if (err) return callback(err);
                    // finally !!!
                    npm.commands.publish([arg.dir], function (err) {
                        if (err) return callback(err);
                        var updated = JSON.parse(fs.readFileSync(pjs));
                        serviceManager.mapUpsert(pjs);
                        // create an issue to track this publish request
                        var pi = {syncletToRun:{}};
                        pi.auth = serviceManager.map('github').auth;
                        pi.syncletToRun.posts = [];
                        var issue = {'title':updated.name+'@'+updated.version, 'body':'Auto-submission to have this published.'};
                        issue.repo = 'Singly/apps';
                        //issue.labels = updated.name.split('-');
                        //issue.labels.push('App');
                        pi.syncletToRun.posts.push(issue);
                        // this feels dirty, but is also reusing the synclet, to do this the synclet must not rely on config or rewriting auth stuff at all!
                        var isynclet = path.join(lconfig.lockerDir, serviceManager.map('github').srcdir, "issue.js");
                        var issues = require(isynclet);
                        delete require.cache[isynclet]; // don't keep the copy in ram!
                        issues.sync(pi, function(err, js){
                            if(err) return callback(err);
                            logger.info(js);
                            if(!js || !js.data || !js.data.issue || !js.data.issue[0] || !js.data.issue[0].number) return callback("failed to create issue to track this for publishing, please re-auth github: "+JSON.stringify(js)); // this text triggers a more friendly response in dashboardv3
                            // save pending=issue# to package.json
                            callback(null, updated, js.data.issue[0]);
                        });
                    });
                });
            });
        });
    });
};

// make sure a package.json exists, or create one
function checkPackage(pjs, arg, gh, callback) {
    fs.stat(pjs, function (err, stat) {
        if (err || !stat || !stat.isFile()) return callback(err || new Error(pjs + ' does not exist.'));

        var js;
        try {
            js = JSON.parse(fs.readFileSync(pjs));
        } catch(err) {
            return callback(err);
        }

        if (js.name != arg.id) {
            logger.warn('while checking package ' + arg.dir + ', found inconsisent name (' + js.name + ') and id (' + arg.id +'), setting name = id');
            js.name = arg.id;
        }

        if (js.repository.handle != arg.id) {
            logger.warn('while checking package ' + arg.dir + ', found inconsisent handle (' + js.repository.handle + ') and id (' + arg.id +'), setting name = id');
            js.repository.handle = arg.id;
        }

        lutil.atomicWriteFileSync(pjs, JSON.stringify(js));
        return callback();
    });
}

var user;
function getUser() {
    if (user && user.username && user.email && user.pw) return user;
    user = {
        username: lcrypto.encrypt('username'), // we just need something locally regenerable
        email: lcrypto.encrypt('email') + '@singly.com', // we just need something locally regenerable
        pw: lcrypto.encrypt('password') // we just need something locally regenerable
    };
    return user;
}

// return authenticated user, or create/init them
function regUser(callback) {
    fs.readFile(path.join(lconfig.lockerDir, lconfig.me, 'registry_auth.json'), 'utf8', function (err, auth) {
        var js;
        try { js = JSON.parse(auth); } catch (E) {}
        if (js) return callback(false, js);
        var user = getUser();
        // try creating this user on the registry
        adduser(user.username, user.pw, user.email, function (err, resp, body) {
            // TODO, is 200 and 409 both valid?
            if (err) logger.error(err);
            //logger.error(resp);
            js = {_auth:(new Buffer(user.username+":"+user.pw,"ascii").toString("base64")), username:user.username, email:user.email};
            lutil.atomicWriteFileSync(path.join(lconfig.lockerDir, lconfig.me, 'registry_auth.json'), JSON.stringify(js));
            callback(false, js);
        });
    });
}

// fetch and cache the connected github account profile
var ghprofile;
function github(callback) {
    if (ghprofile) return callback(ghprofile);
    request.get({uri:lconfig.lockerBase+'/Me/github/getCurrent/profile', json:true}, function (err, resp, body) {
        if (err || !body || body.length != 1 || !body[0].login) return callback();
        ghprofile = body[0];
        callback(ghprofile);
    });
}

// copied and modified from npm/lib/utils/registry/adduser.js
function adduser (username, password, email, cb) {
  if (password.indexOf(":") !== -1) return cb(new Error(
    "Sorry, ':' chars are not allowed in passwords.\n"+
    "See <https://issues.apache.org/jira/browse/COUCHDB-969> for why."));
  var salt = "na"
    , userobj = {name : username
               , salt : salt
               , password_sha : crypto.createHash("sha1").update(password+salt).digest("hex")
               , email : email
               , _id : 'org.couchdb.user:'+username
               , type : "user"
               , roles : []
               , date: new Date().toISOString()};
      logger.info("adding user "+JSON.stringify(userobj));
  request.put({uri:regBase+'/-/user/org.couchdb.user:'+encodeURIComponent(username), json:true, body:userobj}, cb);
}

// given a connector package in the registry, install it, and get the auth url for it to return
function authIsAwesome(req, res) {
    var id = req.params.id;
    var js = serviceManager.map(id);
    if (js) return authRedir(js, req, res); // short circuit if already done
    getPackage(id, function(err, pkg) {
        if(err || !verifyPkg(pkg))
        {
            logger.error("package verification failed trying to auth "+id+": ",err);
            return res.send(id+" failed verification :(", 500);
        }
        exports.install(pkg, function (err) {
            if (err) return res.send(err, 500);
            var js = serviceManager.map(id);
            if (!js) return res.send("failed to install :(", 500);
            return authRedir(js, req, res);
        });
    });
}

// helper for Awesome
function authRedir(js, req, res) {
    var authModule;
    try {
        authModule = require(path.join(lconfig.lockerDir, js.srcdir, 'auth.js'));
    } catch (E) {
        return res.send(E, 500);
    }
    // oauth2 types redirect
    if (authModule.authUrl) {
        if (!apiKeys[js.id]) return res.send("missing required api keys", 500);
        var url = authModule.authUrl + "&client_id=" + apiKeys[js.id].appKey + "&redirect_uri=" + lconfig.externalBase + "/auth/" + js.id + "/auth";
        return res.redirect(url);
    }
    // everything else is pass-through (custom, oauth1, etc)
    authIsAuth(req, res);
}

// handle actual auth api requests or callbacks, much conflation to keep /auth/foo/auth consistent everywhere!
function authIsAuth(req, res) {
    var id = req.params.id;
    logger.verbose("processing auth for "+id);
    var js = serviceManager.map(id);
    if (!js) return res.send("missing", 404);
    var host = lconfig.externalBase + "/";

    var authModule;
    try {
        authModule = require(path.join(lconfig.lockerDir, js.srcdir, 'auth.js'));
    } catch (E) {
        return res.send(E, 500);
    }

    // some custom code gets run for non-oauth2 options here, wear a tryondom
    try {
        if (authModule.direct) return authModule.direct(res);

        // rest require apikeys
        if (!apiKeys[id] && js.keys !== false && js.keys != "false") return res.send("missing required api keys", 500);

        if (typeof authModule.handler == 'function') return authModule.handler(host, apiKeys[id], function (err, auth) {
            if (err) return res.send(err, 500);
            finishAuth(js, auth, res);
        }, req, res);
    } catch (E) {
        return res.send(E, 500);
    }

    // oauth2 callbacks from here on out
    var code = req.param('code');
    var theseKeys = apiKeys[id];
    if (!code || !authModule.handler.oauth2) return res.send("very bad request", 500);

    var method = authModule.handler.oauth2;
    var postData = {
        client_id: theseKeys.appKey,
        client_secret: theseKeys.appSecret,
        redirect_uri: host + 'auth/' + id + '/auth',
        grant_type: authModule.grantType,
        code: code
    };
    req = {method: method, url: authModule.endPoint};
    if (method == 'POST') {
        req.body = querystring.stringify(postData);
        req.headers = {'Content-Type' : 'application/x-www-form-urlencoded'};
    } else {
        req.url += '/access_token?' + querystring.stringify(postData);
    }
    request(req, function (err, resp, body) {
        try {
            body = JSON.parse(body);
        } catch(err) {
            body = querystring.parse(body);
        }
        var auth = {accessToken: body.access_token};
        if (method == 'POST') auth = {token: body, clientID: theseKeys.appKey, clientSecret: theseKeys.appSecret};
        if (typeof authModule.authComplete == 'function') {
            return authModule.authComplete(auth, function (err, auth) {
                if (err) return res.send(err, 500);
                finishAuth(js, auth, res);
            });
        }
        finishAuth(js, auth, res);
    });
}

// save out auth and kick-start synclets, plus respond
function finishAuth(js, auth, res) {
    logger.info("authorized "+js.id);
    js.auth = auth;
    js.authed = Date.now();
    // upsert it again now that it's auth'd, significant!
    serviceManager.mapUpsert(path.join(js.srcdir,'package.json'));
    syncManager.syncNow(js.id, function () {}); // force immediate sync too
    res.end("<script type='text/javascript'>  window.opener.syncletInstalled('" + js.id + "'); window.close(); </script>");
}

function deauthIsAwesomer(req, res) {
  var serviceName = req.params.id;
  var service = serviceManager.map(serviceName);
  delete service.auth;
  delete service.authed;
  service.deleted = Date.now();
  serviceManager.mapDirty(serviceName);
  logger.info("disconnecting "+serviceName);
  res.redirect('back');
}
