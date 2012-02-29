/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require("fs");
var path = require("path");
var lconfig = require("lconfig");
var crypto = require("crypto");
var util = require("util");
var spawn = require('child_process').spawn;
var levents = require('levents');
var wrench = require('wrench');
var lutil = require(__dirname + "/lutil");
var logger;
var async = require('async');

var serviceMap = { }; // All of the immediately addressable services in the system

var shuttingDown = null;
var syncletManager, registry;
var lockerPortNext = parseInt("1" + lconfig.lockerPort, 10);

/**
* Scans the Me directory for instaled services
*/
exports.init = function (sman, reg, callback) {
    logger = require('logger');
    logger.info('lservicemanager lockerPortNext = ' + lockerPortNext);
    syncletManager = sman;
    registry = reg;
    var dirs = fs.readdirSync(lconfig.me);
    for (var i = 0; i < dirs.length; i++) {
        if(dirs[i] == "diary") continue;
        var dir =  lconfig.me + '/' + dirs[i];
        try {
            if(!fs.statSync(dir).isDirectory()) continue;
            if(!path.existsSync(path.join(dir, 'me.json'))) continue;
            var js = serviceMap[dirs[i]] = JSON.parse(fs.readFileSync(path.join(dir, 'me.json'), 'utf8'));
            js.id = dirs[i]; // ensure symmetry
            cleanLoad(js);
            logger.info("Mapped /Me/" + js.id);
        } catch (E) {
            logger.error("Me/"+dirs[i]+" failed to load as a service (" +E+ ")");
        }
    }

    // make sure default collections, ui, and apps are all installed!
    var installs = [];
    if(lconfig.ui) {
        installs.push(lconfig.ui);
        if(lconfig.ui.indexOf(':') != -1) lconfig.ui = lconfig.ui.substr(0,lconfig.ui.indexOf(':')); // only use name hereafter
    }
    if(lconfig.apps) lconfig.apps.forEach(function(app){ installs.push(app); });
    if(lconfig.collections) lconfig.collections.forEach(function(coll){ installs.push(coll); });
    async.forEachSeries(installs, function(id, cb){
        var arg = {};
        // allow a configurable name:path/to/it value for local installs
        // This will currently directly upsert and skip the install
        if(id.indexOf(':') != -1)
        {
            exports.mapUpsert(path.join(id.substr(id.indexOf(':')+1), "package.json"));
            return cb();
        }else{
            arg.name = id;
        }
        if(serviceMap[id]) return cb();
        registry.install(arg, cb);
    }, callback);
};

// return whole map or just one service from it
exports.map = function(id) {
    if(id) return serviceMap[id];
    return serviceMap;
};

// a way to signal that a specific service's data has changed and should be saved back to it's me.json
exports.mapDirty = function(id) {
    if(!serviceMap[id]) return;
    // this could use a timer to just save once after a few second delay, if something is saving a lot quickly
    var dir = path.join(lconfig.lockerDir, lconfig.me, id);
    if(!path.existsSync(dir)) fs.mkdirSync(dir,0755);
    lutil.atomicWriteFileSync(path.join(dir, 'me.json'), JSON.stringify(serviceMap[id], null, 4));
};

/**
* Returns an array of the services that provide the specified types
*/
exports.providers = function(types) {
    var services = [];
    for(var svcId in serviceMap) {
        if (!serviceMap.hasOwnProperty(svcId))  continue;
        var service = serviceMap[svcId];
        if (!service.hasOwnProperty("provides")) continue;
        if (service.provides.some(function(svcType, index, actualArray) {
            for (var i = 0; i < types.length; i++) {
                var currentType = types[i];
                var currentTypeSlashIndex = currentType.indexOf("/");
                if (currentTypeSlashIndex < 0) {
                    // This is a primary only comparison
                    var svcTypeSlashIndex = svcType.indexOf("/");
                    if (svcTypeSlashIndex < 0 && currentType == svcType) return true;
                    if (currentType == svcType.substring(0, svcTypeSlashIndex)) return true;
                    continue;
                }
                // Full comparison
                if (currentType == svcType) return true;
            }
            return false;
        })) {
            services.push(service);
        }
    }
    return services;
};

// lutil.extend is YOUR MOM
function fuckingMerge(alive, dead)
{
    // we have to intelligently merge synclets array!
    if(dead.synclets){
        if(!alive.synclets) alive.synclets = [];
        var ndx = {};
        for(var i = 0; i < alive.synclets.length; i++) ndx[alive.synclets[i].name] = alive.synclets[i];
        for(var i = 0; i < dead.synclets.length; i++) {
            var s = dead.synclets[i];
            if(ndx[s.name]) Object.keys(s).forEach( function(key){ ndx[s.name][key] = s[key] } );
            if(!ndx[s.name]) alive.synclets.push(s);
        }
    }
    // everything else dumb copy
    Object.keys(dead).forEach(function(key){
        if(key != "synclets") alive[key] = dead[key];
    });
}

// update or install this file into the map
exports.mapUpsert = function (file) {
    var js;
    // ensure file is always relative to lockerdir
    file = lutil.relative(lconfig.lockerDir, file);
    logger.verbose("upsert request for "+file);
    try {
        js = JSON.parse(fs.readFileSync(file, 'utf8'));
        if(!js || !js.repository) throw new Error("missing or invalid data");
        // flatten into one, repository primary
        var repo = js.repository;
        delete js.repository;
        lutil.extend(true, js, repo);
        lutil.parseAuthor(js);
        if(!js.handle) throw new Error("no handle");
        js.handle = js.handle.toLowerCase(); // sanity
        // synclets are in their own file, extend them in too
        var sync = path.join(lconfig.lockerDir, path.dirname(file),"synclets.json");
        if(path.existsSync(sync)) {
            fuckingMerge(js, JSON.parse(fs.readFileSync(sync, 'utf8')));
        }
    } catch (E) {
        logger.error("failed to upsert "+file+" due to "+E);
        return false;
    }

    js.upserted = Date.now();
    js.manifest = file;
    js.srcdir = path.dirname(file);
    js.id = js.provider = js.handle; // kinda legacy where they could differ

    // if it exists already, merge it in and save it
    if(serviceMap[js.handle]) {
        logger.verbose("updating "+js.handle);
        fuckingMerge(serviceMap[js.handle], js);
        exports.mapReload(js.handle);
        // if it's running and updated, signal it to shutdown so new code/config is run at next request
        if(js.pid) try {
            logger.info("restarting " + js.handle + " running at pid " + js.pid);
            process.kill(js.pid, "SIGTERM");
        } catch(e) {}
        // worth detecting if it changed here first?
        levents.fireEvent('service://me/#'+js.handle, 'update', serviceMap[js.handle]);
        return serviceMap[js.handle];
    }

    // creating from scratch
    logger.verbose("creating "+js.handle);
    serviceMap[js.handle] = js;
    js.installed = Date.now();
    cleanLoad(js);
    levents.fireEvent('service://me/#'+js.handle, 'new', js);
    return js;
};

// clean up any me json before loading into map
cleanLoad = function(js)
{
    delete js.pid; // not running
    delete js.starting; // or starting
    js.uri = lconfig.lockerBase+"/Me/"+js.id+"/";
    js.externalUri = lconfig.externalBase+"/Me/"+js.id+"/";
    lutil.parseAuthor(js);
    if(!js.version) js.version = 1;
    js.loaded = Date.now();
    exports.mapReload(js.id);
};

// make sure this service's necessaries are loaded into the rest of the system
exports.mapReload = function(id)
{
    var js = serviceMap[id];
    if(!js) return;
    // load any events
    if(js.events) {
        for (var i = 0; i < js.events.length; i++) {
            var ev = js.events[i];
            var batching = (ev.length > 2 && ev[2] === true) ? true : false;
            levents.addListener(ev[0], js.id, ev[1], batching);
        }
    }
    // start em up if they're ready
    if(js.synclets && js.auth) {
        for (var j = 0; j < js.synclets.length; j++) {
            syncletManager.scheduleRun(js, js.synclets[j]);
        }
    }
    exports.mapDirty(js.id);
};


//! Spawn a service instance
/**
* \param svc The service description to start
* \param callback Completion callback
*
* The service will be spanwed as described in its configuration file.  The service can
* read its environment description from stdin which will consist of one JSON object.  The
* object will have a mandatory port and workingDirectory field, but the rest is optional.
* \code
*   {
*     port:18044,
*     workingDirectory:"/some/path/"
*   }
* \endcode
* Once the service has completed its startup it will write out to stdout a single JSON object
* with the used port and any other environment information.  The port must be the actual
* port the service is listening on.
* \code
*   {
*     port:18044
*   }
* \encode
*/
exports.spawn = function(serviceId, callback) {
    if(!callback) callback = function(){};
    var svc = serviceMap[serviceId];
    if (!svc) {
        logger.error("Attempting to spawn an unknown service " + serviceId);
        return callback();
    }
    if (!svc.run) {
        logger.error("No run information for " + serviceId);
        return callback();
    }

    // Already running
    if (svc.pid) return callback();
    // Queue up callbacks if we are already trying to start this service
    if (svc.hasOwnProperty("starting")) {
        logger.info(svc.id + " is still spawning, adding callback to queue.");
        svc.starting.push(callback);
        return;
    } else {
        svc.starting = [callback];
    }

    run = svc.run.split(" "); // node foo.js

    svc.port = ++lockerPortNext;
    logger.info('spawning into: ' + path.join(lconfig.lockerDir, lconfig.me, svc.id));
    var processInformation = getProcessInformation(svc);

    var env = process.env;
    env["NODE_PATH"] = path.join(lconfig.lockerDir, 'Common', 'node') + ":" + path.join(lconfig.lockerDir, "node_modules");
    env["PATH"] += ":" + processInformation.sourceDirectory;

    var tstart = Date.now();
    var command = run[0];
    var args = run.slice(1);
    logger.verbose("Spawning command '" + command + "'' with args " + JSON.stringify(args) + ", cwd " + processInformation.sourceDirectory + " and processInfo " + JSON.stringify(processInformation));
    var app = spawn(command, args, {cwd: processInformation.sourceDirectory, env:process.env});

    app.stderr.on('data', function (data) {
        process.stderr.write('[' + svc.id + '] ' + data.toString());
    });

    var dbuff = "";
    app.stdout.setEncoding("utf8");
    app.stdout.on('data',function (data) {
        if (svc.hasOwnProperty("pid")) {
            // We're already running so just log it for them
            // process.stdout.setEncoding('utf-8');
            process.stdout.write('[' + svc.id + '] ' + data.toString());
        } else {
            // Process the startup json info
            dbuff += data;
            try {
                var nl = dbuff.indexOf("\n");
                if(nl > 0) dbuff = dbuff.substr(0,nl); // cut off any extra stuff, if any... TODO: we should have better newline parsing
                var returnedProcessInformation = JSON.parse(dbuff);
            }catch(error){
                if(dbuff.substr(0,1) == '{')
                { // json hasn't all been written yet, come back, should use newline terminated!
                    return;
                }
                logger.error("The process did not return valid startup information. "+error+" on "+dbuff);
                app.kill();
            }
            try {
                // if they tell us a port, use that
                if(returnedProcessInformation.port) svc.port = returnedProcessInformation.port;
                svc.uriLocal = "http://localhost:"+svc.port+"/";
                logger.info("Set local uri to " + svc.uriLocal + " for " + svc.id);
                // save out all updated meta fields
                //fs.writeFileSync(lconfig.lockerDir + "/" + lconfig.me + "/" + svc.id + '/me.json',JSON.stringify(svc, null, 4));
                // Set the pid after the write because it's transient to this locker instance only
                // I'm confused why we have to use startingPid and app.pid is invalid here
                svc.pid = svc.startingPid;
                delete svc.startingPid;
                logger.info(svc.id + " started at pid " + svc.pid + ", running startup callbacks, timing "+(Date.now() - tstart));
                if(svc.starting) svc.starting.forEach(function(cb) {
                    cb.call();
                    // See if it ended whilst running the callbacks
                    if (!svc.hasOwnProperty("pid") && svc.starting.length > 0) {
                        // We'll try again in a sec
                        setTimeout(function() {
                            exports.spawn(svc.id);
                        }, 10);
                        return;
                    }
                });
                delete svc.starting;
                svc.started = Date.now();
            } catch(error) {
                logger.error("The process did not return valid startup information. "+error);
                app.kill();
            }
        }

    });

    app.on('exit', function (code,signal) {
        logger.info(svc.id + " exited with status " + code + ", signal " + signal);
        var id = svc.id;
        //remove transient fields
        delete svc.pid;
        delete svc.port;
        delete svc.uriLocal;
        delete svc.starting;
        delete svc.started;
        svc.ended = Date.now();
        checkForShutdown();
    });

    logger.verbose("sending "+svc.id+" startup info of "+JSON.stringify(processInformation));

    app.stdin.on('error',function(err){
        logger.error("STDIN error:" + util.inspect(err));
    });
    app.stdin.write(JSON.stringify(processInformation)+"\n"); // Send them the process information

    // We track this here because app.pid doesn't seem to work inside the next context
    svc.startingPid = app.pid;
    svc.last = Date.now();
    setTimeout(function() { quiesce(svc); }, lconfig.quiesce);
};

function getProcessInformation(svc) {
  var processInformation = {
    port: svc.port, // This is just a suggested port
    sourceDirectory: ((svc.srcdir.charAt(0) == '/') ? svc.srcdir : path.join(lconfig.lockerDir, svc.srcdir)),
    workingDirectory: path.join(lconfig.lockerDir, lconfig.me, svc.id), // A path into the me directory
    lockerUrl: lconfig.lockerBase,
    externalBase: lconfig.externalBase + '/Me/' + svc.id + '/'
  };
  if (svc.mongoCollections) {
    processInformation.mongo = {
      host: lconfig.mongo.host,
      port: lconfig.mongo.port
    };
    processInformation.mongo.collections = svc.mongoCollections;
  }
  return processInformation;
}

function quiesce(svc)
{
    if(!svc) return;
    if(svc.starting || Date.now() - svc.last < (lconfig.quiesce / 2)){
        logger.info("delaying quiesce for "+svc.id);
        return setTimeout(function() { quiesce(svc); }, lconfig.quiesce);
    }
    if(!svc.pid) return logger.warn("trying to quiesce "+svc.id+" but missing pid");
    try {
        logger.info("quiesce idle service " + svc.id + " at pid " + svc.pid);
        process.kill(svc.pid, "SIGTERM");
    } catch(e) {
        logger.error("got error while quiescing: "+e);
    }
}

/**
* Shutdown all running services
*
* \param cb Callback to call when the shutdown is complete
*/
exports.shutdown = function(cb) {
    shuttingDown = cb;
    for(var mapEntry in serviceMap) {
        var svc = serviceMap[mapEntry];
        if (svc.pid) {
            try {
                logger.info("Signalling " + svc.id + " to shut down (pid " + svc.pid + ")");
                process.kill(svc.pid, "SIGINT");
            } catch(e) {
            }
        }
    }
    checkForShutdown();
};


/* nothing uses this and it seems dangerously destructive
exports.uninstall = function(serviceId, callback) {
    var svc = serviceMap.installed[serviceId];
    var lmongo = require('lmongo');
    lmongo.init(svc.id, svc.mongoCollections, function(mongo, colls) {
        var keys = Object.getOwnPropertyNames(colls);
        (function deleteCollection (keys, callback) {
            if (keys.length > 0) {
                key = keys.splice(0, 1);
                coll = colls[key];
                coll.drop(function() {deleteCollection(keys, callback);});
            } else {
                callback();
            }
        })(keys, function() {
            svc.uninstalled = true;
            if (svc.pid) {
                process.kill(svc.pid, "SIGINT");
            }
            wrench.rmdirSyncRecursive(lconfig.me + "/" + serviceId);
            delete serviceMap.installed[serviceId];
            callback();
        });
    });
}
*/

/**
* Return whether the service is running
*/
exports.isRunning = function(serviceId) {
    return serviceMap[serviceId] && serviceMap[serviceId].pid;
};

function checkForShutdown() {
    if (!shuttingDown) return;
    for(var mapEntry in serviceMap) {
        var svc = serviceMap[mapEntry];
        if (svc.pid)  {
            logger.info("Waiting for "+svc.id+" to exit.");
            return;
        }
    }
    shuttingDown();
    shuttingDown = null;
}

exports.getCollectionApis = function() {
  var collectionApis = {};
  for (var i in serviceMap) {
    if (serviceMap[i].type === 'collection') {
      var modulePath = path.join(lconfig.lockerDir, serviceMap[i].srcdir, 'api.js');
      if (path.existsSync(modulePath)) {
        collectionApis[i] = {
          api: require(modulePath),
          lockerInfo: getProcessInformation(serviceMap[i])
        };
      }
    }
  }
  return collectionApis;
}
