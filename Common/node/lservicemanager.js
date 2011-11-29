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

var serviceMap = {
    available:[],
    disabled:[],
    installed:{},
    migrations:[]
};

var shuttingDown = null;
var lockerPortNext = parseInt("1" + lconfig.lockerPort, 10);
logger.info('lservicemanager lockerPortNext = ' + lockerPortNext);

exports.serviceMap = function() {
    var sterilized = lutil.extend(true, {}, serviceMap);
    if (sterilized.installed) {
        for (var i in sterilized.installed) {
            delete sterilized.installed[i].port;
            delete sterilized.installed[i].uriLocal;
            delete sterilized.installed[i].pid;
            delete sterilized.installed[i].startingPid;
        }
    }
    return sterilized;
    //return serviceMap;
}

exports.providers = function(types) {
    var services = [];
    for(var svcId in serviceMap.installed) {
        if (!serviceMap.installed.hasOwnProperty(svcId))  continue;
        var service = serviceMap.installed[svcId];
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

/**
* Map a meta data file JSON with a few more fields and make it available
*/
function mapMetaData(file, type, installable) {
    var metaData = JSON.parse(fs.readFileSync(file, 'utf8'));
    metaData.manifest = file;
    metaData.srcdir = path.dirname(file);
    metaData.is = type;
    metaData.installable = installable;
    serviceMap.available.push(metaData);
    if (type === "collection") {
        logger.info("***** Should install collection " + metaData.handle);
        if(!metaData.handle) {
            logger.error("missing handle for "+file);
            return;
        }
        if (metaData.status != 'stub') {
            var err = false;
            try {
                var stat = fs.statSync(path.join(lconfig.lockerDir, lconfig.me, metaData.handle));
            } catch (E) {
                err = true
            }
            if(err || !stat) {
                exports.install(metaData, true);
                /*
                metaData.id=metaData.handle;
                metaData.uri = lconfig.lockerBase+"/Me/"+metaData.id+"/";
                metaData.externalUri = lconfig.externalBase+"/Me/"+metaData.id+"/";
                serviceMap.installed[metaData.id] = metaData;
                fs.mkdirSync(lconfig.lockerDir + "/" + lconfig.me + "/"+metaData.id,0755);
                fs.writeFileSync(lconfig.lockerDir + "/" + lconfig.me + "/"+metaData.id+'/me.json',JSON.stringify(metaData, null, 4));
                */
            }
        }
    }
    if(metaData.autoInstall) {
        var err = false;
        try {
            var stat = fs.statSync(path.join(lconfig.lockerDir, lconfig.me, metaData.handle));
        } catch (E) {
            err = true
        }
        if(err || !stat) {
            exports.install(metaData);
        }
    }
    return metaData;
}

/**
* The types of services that are currently understood
*/
var scannedTypes = ["collection", "connector", "app"];

/**
* Scans a directory for available services
*/
exports.scanDirectory = function(dir, installable) {
    if (typeof(installable) == "undefined") {
        installable = true;
    }

    var files = fs.readdirSync(dir);
    for (var i = 0; i < files.length; i++) {
        var fullPath = dir + '/' + files[i];
        var stats = fs.statSync(fullPath);
        if(stats.isDirectory()) {
            exports.scanDirectory(fullPath, installable);
            continue;
        }
        scannedTypes.forEach(function(scanType) {
            if (RegExp("\\." + scanType + "$").test(fullPath)) {
                mapMetaData(fullPath, scanType, installable);
            }
        });
    }
}

function mergedManifest(dir)
{
    // Don't use metainfo here because we aren't fully setup
    var js = JSON.parse(fs.readFileSync(dir+'/me.json', 'utf8'));
    var serviceInfo = {};
    serviceMap.available.some(function(svcInfo) {
        if (svcInfo.srcdir == js.srcdir) {
            for(var a in svcInfo){serviceInfo[a]=svcInfo[a];}
            return true;
        }
        return false;
    });
    if (serviceInfo && serviceInfo.manifest) {

        var fullInfo = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir, serviceInfo.manifest)));
        if(!fullInfo.handle && fullInfo.repository) {
            var version =fullInfo.version;
            fullInfo = fullInfo.repository;
            fullInfo.version = version; // at least preserve native package version
        }
        return lutil.extend(js, fullInfo);
    } else {
        return js;
    }
}

// update any existing map references to this manifest
exports.mapUpsert = function (file, type) {
    var metaData;
    try {
        metaData = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir,file), 'utf8'));
        if(!metaData) throw new Error("no data");
        // in package.json files our manifest data is in 'repository', TODO TECH DEBT CLEANUP
        if(!metaData.handle && metaData.repository) {
            var version = metaData.version;
            metaData = metaData.repository;
            metaData.version = version; // at least preserve native package version
        }
        if(!metaData.handle) throw new Error("no handle");
    } catch (E) {
        logger.error("failed to upsert "+file+" due to "+E);
        return;
    }
    metaData.manifest = file;
    metaData.srcdir = path.dirname(file);
    metaData.is = type;
    metaData.installable = true;
    // replace references in available array (legacy)
    var found = false;
    serviceMap.available.some(function(svcInfo) {
        if (svcInfo.srcdir == metaData.srcdir) {
            found = true;
            for(var a in metaData){svcInfo[a]=metaData[a];}
        }
    });
    if(!found) serviceMap.available.push(metaData);
    // update any "installed"
    exports.install(metaData);
    if(serviceMap.installed[metaData.handle]) return serviceMap.installed[metaData.handle] = lutil.extend(serviceMap.installed[metaData.handle], metaData);
    return metaData;
}

/**
* Scans the Me directory for instaled services
*/
exports.findInstalled = function () {
    serviceMap.installed = {};
    var dirs = fs.readdirSync(lconfig.me );
    for (var i = 0; i < dirs.length; i++) {
        if(dirs[i] == "diary") continue;
        var dir =  lconfig.me + '/' + dirs[i];
        try {
            if(!fs.statSync(dir).isDirectory()) continue;
            if(!fs.statSync(dir+'/me.json').isFile()) continue;
            var js = mergedManifest(dir);
            if (!js.synclets) {
                delete js.pid;
                delete js.starting;
                js.externalUri = lconfig.externalBase+"/Me/"+js.id+"/";
                serviceMap.installed[js.id] = js;
                if (js.disabled) {
                    logger.info("Disabled " + js.id);
                    serviceMap.disabled.push(js.id);
                } else {
                    js = serviceMap.installed[js.id] = exports.migrate(dir, js);
                    addEvents(js);
                    logger.info("Loaded " + js.id);
                }
            }
        } catch (E) {
//            logger.error("Me/"+dirs[i]+" does not appear to be a service (" +E+ ")");
        }
    }
}

addEvents = function(info) {
    if (info.events) {
        for (var i = 0; i < info.events.length; i++) {
            var ev = info.events[i];
            levents.addListener(ev[0], info.id, ev[1]);
        }
    }

}

/**
* Migrate a service if necessary, return new json that might have been changed
*/
exports.migrate = function(installedDir, metaData) {
    if (!metaData.version) { metaData.version = 1; }
    var migrations = [];
    try {
        migrations = fs.readdirSync(metaData.srcdir + "/migrations");
    } catch (E) {}
    if (migrations) {
        migrations = migrations.sort(); // do in order, so versions are saved properly
        for (var i = 0; i < migrations.length; i++) {
            if (migrations[i].substring(0, 13) > metaData.version) {
                try {
                    var cwd = process.cwd();
                    logger.info("running migration : " + migrations[i] + " for service " + metaData.title);
                    migrate = require(cwd + "/" + metaData.srcdir + "/migrations/" + migrations[i]);
                    var ret = migrate(installedDir); // prolly needs to be sync and given a callback someday
                    if (ret) {
                        // load new file in case it changed, then save version back out
                        var curMe = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir, lconfig.me, metaData.id, 'me.json'), 'utf8'));
                        metaData.version = migrations[i].substring(0, 13);
                        curMe.version = metaData.version;
                        lutil.atomicWriteFileSync(path.join(lconfig.lockerDir, lconfig.me, metaData.id, 'me.json'),
                                                  JSON.stringify(curMe, null, 4));
                    }else{
                        // this isn't clean but we have to do something drastic!!!
                        logger.error("failed to run migration!");
                        process.exit(1);
                    }
                    // if they returned a string, it's a post-startup callback!
                    if (typeof ret == 'string')
                    {
                        serviceMap.migrations.push(lconfig.lockerBase+"/Me/"+metaData.id+"/"+ret);
                    }
                    process.chdir(cwd);
                } catch (E) {
                    logger.log("error running migration : " + migrations[i] + " for service " + metaData.title + " ---- " + E);
                    process.chdir(cwd);
                }
            }
        }
    }
    return metaData;
}

/**
* Install a service
*/
exports.install = function(metaData, installOverride) {
    var serviceInfo;
    serviceMap.available.some(function(svcInfo) {
        if (svcInfo.srcdir == metaData.srcdir) {
            serviceInfo = {};
            for(var a in svcInfo){serviceInfo[a]=svcInfo[a];}
            return true;
        }
        return false;
    });
    if (!serviceInfo || !(serviceInfo.installable || installOverride)) {
        return serviceInfo;
    }
    var meInfo = {}; // The info to save to me.json
    // local/internal name for the service on disk and whatnot, try to make it more friendly to devs/debugging
    if(serviceInfo.handle) {
        // the inanity of this try/catch bullshit is drrrrrrnt but async is stupid here and I'm offline to find a better way atm
        var inc = 0;
        try {
            if(fs.statSync(path.join(lconfig.lockerDir, lconfig.me, serviceInfo.handle)).isDirectory()) {
                inc++;
                while(fs.statSync(path.join(lconfig.lockerDir, lconfig.me, serviceInfo.handle+"-"+inc)).isDirectory()) {inc++;}
            }
        } catch (E) {
            var suffix = (inc > 0)?"-"+inc:"";
            meInfo.id = serviceInfo.handle+suffix;
        }
    } else {
        var hash = crypto.createHash('md5');
        hash.update(Math.random()+'');
        meInfo.id = hash.digest('hex');
    }
    meInfo.srcdir = serviceInfo.srcdir;
    meInfo.version = 1;
    if (path.existsSync(path.join(lconfig.lockerDir, serviceInfo.srcdir, 'migrations'))) {
        var files = fs.readdirSync(path.join(lconfig.lockerDir, serviceInfo.srcdir, 'migrations'));
        var maxMigration = files.sort()[files.length - 1];
        meInfo.version = maxMigration.substring(0, 13);
    }
    meInfo.is = serviceInfo.is;
    meInfo.uri = lconfig.lockerBase+"/Me/"+meInfo.id+"/";
    fs.mkdirSync(path.join(lconfig.lockerDir, lconfig.me, meInfo.id),0755);
    lutil.atomicWriteFileSync(path.join(lconfig.lockerDir, lconfig.me, meInfo.id, 'me.json'),JSON.stringify(meInfo));
    serviceMap.installed[meInfo.id] = mergedManifest(path.join(lconfig.me, meInfo.id));

    var fullInfo = exports.metaInfo(meInfo.id);
    addEvents(fullInfo);
    fullInfo.externalUri = lconfig.externalBase+"/Me/"+meInfo.id+"/";
    return fullInfo;
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
    var svc = exports.metaInfo(serviceId);
    if (!svc) {
        logger.error("Attempting to spawn an unknown service " + serviceId);
        return;
    }

    // Already running
    if (svc.pid) return;
    // Queue up callbacks if we are already trying to start this service
    if (callback) {
        if (svc.hasOwnProperty("starting")) {
            logger.info(svc.id + " is still spawning, adding callback to queue.");
            svc.starting.push(callback);
            return;
        } else {
            svc.starting = [callback];
        }
    }

    //get the run command from the serviceMap based on the service's source directory (possible versioning problem here)
    var run;
    var serviceInfo;
    for(var i in serviceMap.available) {
        if(serviceMap.available[i].srcdir == svc.srcdir) {
            serviceInfo = serviceMap.available[i];
            if (serviceInfo.static == "true") {
                run = "node " + __dirname + "/app/static.js";
            } else {
                run = serviceInfo.run;
            }
            break;
        }
    }
    run = run || svc.run;
    if(!run) {
        logger.error('Could not spawn service from source directory ' +  svc.srcdir);
        return;
    }

    run = run.split(" "); // node foo.js

    svc.port = ++lockerPortNext;
    logger.info('spawning into: ' + path.join(lconfig.lockerDir, lconfig.me, svc.id));
    var processInformation = {
        port: svc.port, // This is just a suggested port
        sourceDirectory: path.join(lconfig.lockerDir, svc.srcdir),
        workingDirectory: path.join(lconfig.lockerDir, lconfig.me, svc.id), // A path into the me directory
        lockerUrl:lconfig.lockerBase,
        externalBase: lconfig.externalBase + '/Me/' + svc.id + '/'
    };
    if(serviceInfo && serviceInfo.mongoCollections) {
        processInformation.mongo = {
            host: lconfig.mongo.host,
            port: lconfig.mongo.port
        }
        processInformation.mongo.collections = serviceInfo.mongoCollections;
    }
    var env = process.env;
    env["NODE_PATH"] = path.join(lconfig.lockerDir, 'Common', 'node');
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
                logger.info(svc.id + " started at pid " + svc.pid + ", running startup callbacks.");
                svc.starting.forEach(function(cb) {
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
        // save out all updated meta fields (pretty print!)
        /*
        if (!svc.uninstalled) {
            fs.writeFileSync(lconfig.lockerDir + "/" + lconfig.me + "/" + id + '/me.json', JSON.stringify(svc, null, 4));
        }
        */
        checkForShutdown();
    });
    logger.verbose("sending "+svc.id+" startup info of "+JSON.stringify(processInformation));
    app.stdin.on('error',function(err){
        logger.error("STDIN error:" + util.inspec(err));
    });
    app.stdin.write(JSON.stringify(processInformation)+"\n"); // Send them the process information
    // We track this here because app.pid doesn't seem to work inside the next context
    svc.startingPid = app.pid;
}

/**
* Retrieve the meta information for a service
*/
exports.metaInfo = function(serviceId) {
    /*
    var installedInfo = serviceMap.installed[serviceId] || {};
    logger.debug("metaInfo")
    logger.debug(installedInfo);
    var serviceInfo;
    serviceMap.available.some(function(svcInfo) {
        if (svcInfo.srcdir == installedInfo.srcdir) {
            serviceInfo = {};
            lutil.extend(serviceInfo, svcInfo);
            return true;
        }
        return false;
    });
    if (!serviceInfo) {
        logger.warn("Unknown");
        throw "Unknown service " + serviceId;
    }
    serviceMap.installed[serviceId] = lutil.extend(serviceInfo, installedInfo);
    */
    return serviceMap.installed[serviceId];
}

exports.getFromAvailable = function(handle) {
    for(var i in serviceMap.available) {
        if(serviceMap.available[i].handle === handle)
            return serviceMap.available[i];
    }
    return null;
}

exports.isInstalled = function(serviceId) {
    if (serviceMap.disabled.indexOf(serviceId) > -1) {
        return false;
    }
    return serviceId in serviceMap.installed;
}

exports.isAvailable = function(serviceId) {
    return serviceId in serviceMap.available;
}

exports.isDisabled = function(serviceId) {
    return (serviceMap.disabled.indexOf(serviceId) > -1);
}

/**
* Shutdown all running services
*
* \param cb Callback to call when the shutdown is complete
*/
exports.shutdown = function(cb) {
    shuttingDown = cb;
    for(var mapEntry in serviceMap.installed) {
        var svc = serviceMap.installed[mapEntry];
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

exports.disable = function(id, callback) {
    if(!id)
        return;
    serviceMap.disabled.push(id);
    var svc = serviceMap.installed[id];
    if(!svc)
        return;
    svc.disabled = true;
    if (svc) {
        if (svc.pid) {
            try {
                logger.info("Killing running service " + svc.id + " at pid " + svc.pid);
                process.kill(svc.pid, "SIGINT");
            } catch (e) {}
        }
        delete svc.uriLocal;
        delete svc.pid;
        delete svc.port;
    }
    // save out all updated meta fields (pretty print!)
    fs.writeFile(path.join(lconfig.lockerDir, lconfig.me, id, 'me.json'), JSON.stringify(svc, null, 4), callback);
}

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

exports.enable = function(id, callback) {
    if(!id)
        return;
    serviceMap.disabled.splice(serviceMap.disabled.indexOf(id), 1);
    var svc;
    for(var i in serviceMap.installed) {
        if(serviceMap.installed[i].id === id) {
            svc = serviceMap.installed[i];
            delete svc.disabled;
        }
    }
    if(!svc)
        return;
    // save out all updated meta fields (pretty print!)
    fs.writeFile(path.join(lconfig.lockerDir, lconfig.me, id, 'me.json'), JSON.stringify(svc, null, 4), callback);
};

/**
* Return whether the service is running
*/
exports.isRunning = function(serviceId) {
    return exports.isInstalled(serviceId) && exports.metaInfo(serviceId).pid;
}

function checkForShutdown() {
    if (!shuttingDown) return;
    for(var mapEntry in serviceMap.installed) {
        var svc = serviceMap.installed[mapEntry];
        if (svc.pid)  {
            logger.info(svc.id + " is still running, cannot complete shutdown.");
            return;
        }
    }
    shuttingDown();
    shuttingDown = null;
}
