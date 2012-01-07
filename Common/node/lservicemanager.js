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
var logger = require('logger');

var serviceMap = { }; // All of the immediately addressable services in the system

var shuttingDown = null;
var syncletManager, registry;
var lockerPortNext = parseInt("1" + lconfig.lockerPort, 10);
logger.info('lservicemanager lockerPortNext = ' + lockerPortNext);

/**
* Scans the Me directory for instaled services
*/
exports.init = function (sman, reg) {
    syncletManager = sman;
    registry = reg;
    var dirs = fs.readdirSync(lconfig.me);
    for (var i = 0; i < dirs.length; i++) {
        if(dirs[i] == "diary") continue;
        var dir =  lconfig.me + '/' + dirs[i];
        try {
            if(!fs.statSync(dir).isDirectory()) continue;
            if(!fs.statSync(dir+'/me.json').isFile()) continue;
            var js = serviceMap[dirs[i]] = JSON.parse(fs.readFileSync(path.join(dir, 'me.json'), 'utf8'));
            js.id = dirs[i]; // ensure symmetry
            cleanLoad(js);
            logger.info("Mapped /Me/" + js.id);
        } catch (E) {
            logger.error("Me/"+dirs[i]+" failed to load as a service (" +E+ ")");
        }
    }

    // make sure default collections, ui, and apps are all installed!
    if(lconfig.ui && !serviceMap[lconfig.ui]) registry.install(lconfig.ui);
    if(lconfig.apps) lconfig.apps.forEach(function(app){
        if(!serviceMap[app]) registry.install(app);
    });
    if(lconfig.collections) lconfig.collections.forEach(function(coll){
        if(!serviceMap[coll]) exports.mapUpsert('Collections/'+coll);
    });
}

// return whole map or just one service from it
exports.map = function(id) {
    if(id) return serviceMap[id];
    return serviceMap;
}

// a way to signal that a specific service's data has changed and should be saved back to it's me.json
exports.mapDirty = function(id) {
    if(!serviceMap[id]) return;
    // this could use a timer to just save once after a few second delay, if something is saving a lot quickly
    lutil.atomicWriteFileSync(path.join(lconfig.lockerDir, lconfig.me, id, 'me.json'), JSON.stringify(serviceMap[id], null, 4));
}

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
}


// update or install this file into the map
exports.mapUpsert = function (file) {
    var js;
    try {
        js = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir,file), 'utf8'));
        if(!js) throw new Error("no data");
        // in package.json files our manifest data is in 'repository', TODO TECH DEBT CLEANUP
        if(!js.handle && js.repository) {
            var version = js.version;
            js = js.repository;
            js.version = version; // at least preserve native package version
        }
        if(!js.handle) throw new Error("no handle");
    } catch (E) {
        logger.error("failed to upsert "+file+" due to "+E);
        return;
    }

    js.upserted = Date.now();

    // if it exists already, merge it in and save it
    if(serviceMap[js.handle]) {
        serviceMap[js.handle] = lutil.extend(serviceMap[js.handle], js);
        mapDirty(js.handle);
        levents.fireEvent('service://me/#'+js.id, 'update', js);
        return serviceMap[js.handle];
    }

    // creating from scratch
    js.id = js.handle; // kinda legacy where they could differ
    serviceMap[js.id] = js;
    js.manifest = file;
    js.srcdir = path.dirname(file);
    js.installed = Date.now();
    cleanLoad(js);
    levents.fireEvent('service://me/#'+js.id, 'new', js);
    return js;
}

// clean up any me json before loading into map
cleanLoad = function(js)
{
    delete js.pid; // not running
    delete js.starting; // or starting
    js.uri = lconfig.lockerBase+"/Me/"+js.id+"/";
    js.externalUri = lconfig.externalBase+"/Me/"+js.id+"/";
    if(!js.version) js.version = 1;
    js.loaded = Date.now();
    if(js.events) {
        for (var i = 0; i < js.events.length; i++) {
            var ev = info.events[i];
            levents.addListener(ev[0], js.id, ev[1]);
        }
    }
    // start em up if they're ready
    if(js.synclets && js.auth) {
        for (var j = 0; j < js.synclets.length; j++) {
            syncletManager.scheduleRun(js, js.synclets[j]);
        }
    }
    mapDirty(js.id);
}


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
    var processInformation = {
        port: svc.port, // This is just a suggested port
        sourceDirectory: path.join(lconfig.lockerDir, svc.srcdir),
        workingDirectory: path.join(lconfig.lockerDir, lconfig.me, svc.id), // A path into the me directory
        lockerUrl:lconfig.lockerBase,
        externalBase: lconfig.externalBase + '/Me/' + svc.id + '/'
    };
    if(svc.mongoCollections) {
        processInformation.mongo = {
            host: lconfig.mongo.host,
            port: lconfig.mongo.port
        }
        processInformation.mongo.collections = svc.mongoCollections;
    }
    var env = process.env;
    env["NODE_PATH"] = path.join(lconfig.lockerDir, 'Common', 'node');
    var tstart = Date.now();
    var app = spawn(run.shift(), run, {cwd: processInformation.sourceDirectory, env:process.env});
    app.stdout.setEncoding("utf8");
    app.stderr.on('data', function (data) {
        process.stderr.write('[' + svc.id + '] ' + data.toString());
    });
    var dbuff = "";
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
        logger.info(svc.id + " process has ended. (" + code + ":" + signal + ")");
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
        logger.error("STDIN error:" + util.inspec(err));
    });
    app.stdin.write(JSON.stringify(processInformation)+"\n"); // Send them the process information
    // We track this here because app.pid doesn't seem to work inside the next context
    svc.startingPid = app.pid;
    svc.last = Date.now();
    setTimeout(function() { quiesce(svc); }, lconfig.quiesce);
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
                logger.info("Killing running service " + svc.id + " at pid " + svc.pid);
                process.kill(svc.pid, "SIGINT");
            } catch(e) {
            }
        }
    }
    checkForShutdown();
}


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
    return exports.isInstalled(serviceId) && serviceMap[serviceId].pid;
}

function checkForShutdown() {
    if (!shuttingDown) return;
    for(var mapEntry in serviceMap) {
        var svc = serviceMap[mapEntry];
        if (svc.pid)  {
            logger.info(svc.id + " is still running, cannot complete shutdown.");
            return;
        }
    }
    shuttingDown();
    shuttingDown = null;
}
