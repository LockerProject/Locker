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
var spawn = require('child_process').spawn;

var serviceMap = {
    available:[],
    installed:{}
};

var shuttingDown = null;
var lockerPortNext = parseInt("1" + lconfig.lockerPort, 10);
console.log('lservicemanager lockerPortNext = ' + lockerPortNext);

exports.serviceMap = function() {
    // XXX Sterilize?
    return serviceMap;
}

exports.providers = function(types) {
    var services = []
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
function mapMetaData(file, type) {
    var metaData = JSON.parse(fs.readFileSync(file, 'utf-8'));
    metaData.srcdir = path.dirname(file);
    metaData.is = type;
    serviceMap["available"].push(metaData);
    return metaData;
}
    
/**
* The types of services that are currently understood
*/
var scannedTypes = ["collection", "connector", "app"];

/**
* Scans a directory for available services
*/
exports.scanDirectory = function(dir) {
    var files = fs.readdirSync(dir);
    for (var i = 0; i < files.length; i++) {
        var fullPath = dir + '/' + files[i];
        var stats = fs.statSync(fullPath);
        if(stats.isDirectory()) {
            exports.scanDirectory(fullPath);
            continue;
        }
        scannedTypes.forEach(function(scanType) {
            if (RegExp("\\." + scanType + "$").test(fullPath)) {
                mapMetaData(fullPath, scanType);
            }
        });
    }
}

/**
* Scans the Me directory for instaled services
*/
exports.findInstalled = function () {
    serviceMap.installed = {};
    var dirs = fs.readdirSync('Me');
    for (var i = 0; i < dirs.length; i++) {
        if(dirs[i] == "diary") continue;
        var dir =  'Me/' + dirs[i];
        try {
            if(!fs.statSync(dir).isDirectory()) continue;
            if(!fs.statSync(dir+'/me.json').isFile()) continue;
            var js = JSON.parse(fs.readFileSync(dir+'/me.json', 'utf-8'));
            delete js.pid;
            delete js.starting;
            console.log("Installing " + js.id);
            serviceMap.installed[js.id] = js;
        } catch (E) {
            console.log("Me/"+dirs[i]+" does not appear to be a service (" +E+ ")");
        }
    }
}

/**
* Install a service
*/
exports.install = function(metaData) {
    var serviceInfo = undefined;
    serviceMap.available.some(function(svcInfo) {
        console.log("Comparing " + svcInfo.srcdir + " to " + metaData.srcdir);
        if (svcInfo.srcdir == metaData.srcdir) {
            serviceInfo = new Object();
            for(var a in svcInfo){serviceInfo[a]=svcInfo[a];};
            return true;
        }
        return false;
    });
    if (!serviceInfo) {
        return serviceInfo;
    }
    // local/internal name for the service on disk and whatnot, try to make it more friendly to devs/debugging
    if(serviceInfo.handle)
    {
        // the inanity of this try/catch bullshit is drrrrrrnt but async is stupid here and I'm offline to find a better way atm
        var inc = 0;
        try {
            if(fs.statSync(lconfig.lockerDir+"/Me/"+serviceInfo.handle).isDirectory())
            {
                inc++;
                while(fs.statSync(lconfig.lockerDir+"/Me/"+serviceInfo.handle+"-"+inc).isDirectory()) {inc++;}
            }
        } catch (E) {
            var suffix = (inc > 0)?"-"+inc:"";
            serviceInfo.id = serviceInfo.handle+suffix;
        }
    }else{
        var hash = crypto.createHash('md5');
        hash.update(Math.random()+'');
        serviceInfo.id = hash.digest('hex');        
    }
    serviceInfo.uri = lconfig.lockerBase+"/Me/"+serviceInfo.id+"/";
    serviceMap.installed[serviceInfo.id] = serviceInfo;
    fs.mkdirSync(lconfig.lockerDir + "/Me/"+serviceInfo.id,0755);
    fs.writeFileSync(lconfig.lockerDir + "/Me/"+serviceInfo.id+'/me.json',JSON.stringify(serviceInfo));

    return serviceInfo;
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
        console.error("Attemtping to spawn an unknown service " + serviceId);
        return;
    }

    // Already running
    if (svc.pid) return;
    // Queue up callbacks if we are already trying to start this service
    if (callback) {
        if (svc.hasOwnProperty("starting")) {
            console.log(svc.id + " is still spawning, adding callback to queue.");
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
            run = serviceInfo.run;
            break;
        }
    }
    run = run || svc.run;
    if(!run) {
        console.error('Could not spawn service from source directory', svc.srcdir);
        return;
    }
    
    run = run.split(" "); // node foo.js

    svc.port = ++lockerPortNext;
    console.log('spawning into: ' + lconfig.lockerDir + '/Me/' + svc.id);
    var processInformation = {
        port: svc.port, // This is just a suggested port
        sourceDirectory: svc.srcdir,
        processOptions: {},
        workingDirectory: lconfig.lockerDir + '/Me/' + svc.id, // A path into the me directory
        lockerUrl:lconfig.lockerBase
    };
    if(serviceInfo && serviceInfo.mongoCollections) {
        processInformation.mongo = {
            host: lconfig.mongo.host,
            port: lconfig.mongo.port
        }
        processInformation.mongo.collections = serviceInfo.mongoCollections;
    }
    if (serviceInfo && serviceInfo.processOptions) {
        processInformation.processOptions = serviceInfo.processOptions;
    }
    app = spawn(run.shift(), run, {cwd: svc.srcdir});
    app.stderr.on('data', function (data) {
        var mod = console.outputModule
        console.outputModule = svc.title
        console.error(data);
        console.outputModule = mod
    });
    app.stdout.on('data',function (data) {
        var mod = console.outputModule
        console.outputModule = svc.title
        if (svc.hasOwnProperty("pid")) {
            // We're already running so just log it for them
            console.log(data);
        } else {
            // Process the startup json info
            try {
                var returnedProcessInformation = JSON.parse(data);

                // if they tell us a port, use that
                if(returnedProcessInformation.port)
                    svc.port = returnedProcessInformation.port;
                svc.uriLocal = "http://localhost:"+svc.port+"/";
                // save out all updated meta fields
                fs.writeFileSync(lconfig.lockerDir + "/Me/" + svc.id + '/me.json',JSON.stringify(svc));
                // Set the pid after the write because it's transient to this locker instance only
                // I'm confused why we have to use startingPid and app.pid is invalid here
                svc.pid = svc.startingPid;
                delete svc.startingPid;
                console.log(svc.id + " started at pid " + svc.pid + ", running startup callbacks.");
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
                console.error("The process did not return valid startup information. "+error);
                app.kill();
            }
        }
        console.outputModule = mod;
        
    });
    app.on('exit', function (code) {
        console.log(svc.id + " process has ended.");
        var id = svc.id;
        //remove transient fields
        delete svc.pid;
        delete svc.port;
        delete svc.uriLocal;
        // save out all updated meta fields (pretty print!)
        fs.writeFileSync(lconfig.lockerDir + "/Me/" + id + '/me.json',JSON.stringify(svc, null, 4));
        checkForShutdown();
    });
    console.log("sending "+svc.id+" startup info of "+JSON.stringify(processInformation));
    app.stdin.write(JSON.stringify(processInformation)+"\n"); // Send them the process information
    // We track this here because app.pid doesn't seem to work inside the next context
    svc.startingPid = app.pid;
}

/**
* Retrieve the meta information for a service
*/
exports.metaInfo = function(serviceId) {
    return serviceMap.installed[serviceId];
}

exports.isInstalled = function(serviceId) {
    return serviceId in serviceMap.installed;
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
                console.log("Killing running service " + svc.id + " at pid " + svc.pid);
                process.kill(svc.pid, "SIGINT");
            } catch(e) {
            }
        }
    }
    checkForShutdown();
}

/**
* Return whether the service is running
*/
exports.isRunning = function(serviceId) {
    return exports.isInstalled(serviceId) && exports.metaInfo(serviceId).pid
}

function checkForShutdown() {
    if (!shuttingDown) return;
    for(var mapEntry in serviceMap.installed) {
        var svc = serviceMap.installed[mapEntry];
        if (svc.pid)  {
            console.log(svc.id + " is still running can not complete shutdown.");
            return;
        }
    }
    shuttingDown();
    shuttingDown = null;
}
