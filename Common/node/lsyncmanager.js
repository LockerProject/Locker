var fs = require('fs')
  , path = require('path')
  , lconfig = require("lconfig")
  , spawn = require('child_process').spawn
  , ldatastore = require('ldatastore')
  , datastore = {}
  , async = require('async')
  , url = require('url')
  , lutil = require('lutil')
  , EventEmitter = require('events').EventEmitter
  , levents = require(__dirname + '/levents')
  , logger = require("./logger.js");
  ;

// this works, but feels like it should be a cleaner abstraction layer on top of the datastore instead of this garbage
datastore.init = function(callback) {
    ldatastore.init('synclets', callback);
}

datastore.addCollection = function(collectionKey, id, mongoId) {
    ldatastore.addCollection('synclets', collectionKey, id, mongoId);
}

datastore.removeObject = function(collectionKey, id, ts, callback) {
    if (typeof(ts) === 'function') {
        ldatastore.removeObject('synclets', collectionKey, id, {timeStamp: Date.now()}, ts);
    } else {
        ldatastore.removeObject('synclets', collectionKey, id, ts, callback);
    }
}

datastore.addObject = function(collectionKey, obj, ts, callback) {
    ldatastore.addObject('synclets', collectionKey, obj, ts, callback);
}

var synclets = {
    available:[],
    installed:{},
    executeable:true
};

exports.synclets = function() {
  return synclets;
};

exports.providers = function(types) {
    var services = [];
    for(var svcId in synclets.installed) {
        if (!synclets.installed.hasOwnProperty(svcId))  continue;
        var service = synclets.installed[svcId];
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
* Scans the Me directory for installed synclets
*/
exports.findInstalled = function (callback) {
    if (!path.existsSync(lconfig.me)) fs.mkdirSync(lconfig.me, 0755);
    var dirs = fs.readdirSync(lconfig.me);
    for (var i = 0; i < dirs.length; i++) {
        var dir =  lconfig.me + "/" + dirs[i];
        try {
            if(!fs.statSync(dir).isDirectory()) continue;
            if(!path.existsSync(dir+'/me.json')) continue;
            var js = JSON.parse(fs.readFileSync(dir+'/me.json', 'utf8'));
            if (js.synclets) {
                js = mergeManifest(js);
                exports.migrate(dir, js);
                logger.info("Loaded synclets for "+js.id);
                synclets.installed[js.id] = js;
                synclets.installed[js.id].status = "waiting";
                for (var j = 0; j < js.synclets.length; j++) {
                    js.synclets[j].status = 'waiting';
                    scheduleRun(js, js.synclets[j]);
                }
            }
        } catch (E) {
            logger.warn("Me/"+dirs[i]+" does not appear to be a synclet (" +E+ ")");
        }
    }
}

exports.scanDirectory = function(dir) {
    var files = fs.readdirSync(dir);
    for (var i = 0; i < files.length; i++) {
        var fullPath = dir + '/' + files[i];
        var stats = fs.statSync(fullPath);
        if(stats.isDirectory()) {
            exports.scanDirectory(fullPath);
            continue;
        }
        if (RegExp("\\.synclet$").test(fullPath)) {
            mapMetaData(fullPath);
        }
    }
    addUrls();
}

/**
* Install a synclet
*/
exports.install = function(metaData) {
    var serviceInfo;
    synclets.available.some(function(svcInfo) {
        if (svcInfo.srcdir == metaData.srcdir) {
            serviceInfo = {};
            for(var a in svcInfo){serviceInfo[a]=svcInfo[a];}
            serviceInfo.auth = metaData.auth;
            return true;
        }
        return false;
    });
    if (!serviceInfo) return serviceInfo;

    // local/internal name for the service on disk and whatnot, try to make it more friendly to devs/debugging
    if(serviceInfo.provider) {
        var inc = 0;
        if (path.existsSync(path.join(lconfig.lockerDir, lconfig.me, serviceInfo.provider))) {
            inc++;
            while (path.existsSync(path.join(lconfig.lockerDir, lconfig.me, serviceInfo.provider + '-' + inc))) inc++;
            serviceInfo.id = serviceInfo.provider + "-" + inc;
        } else {
            serviceInfo.id = serviceInfo.provider;
        }
    } else {
        throw "invalid synclet, has no provider";
    }
    synclets.installed[serviceInfo.id] = serviceInfo;
    serviceInfo.version = Date.now();
    fs.mkdirSync(path.join(lconfig.lockerDir, lconfig.me, serviceInfo.id),0755);
    lutil.atomicWriteFileSync(path.join(lconfig.lockerDir, lconfig.me, serviceInfo.id, 'me.json'),
                              JSON.stringify(serviceInfo, null, 4));
    for (var i = 0; i < serviceInfo.synclets.length; i++) {
        scheduleRun(serviceInfo, serviceInfo.synclets[i]);
    }
    levents.fireEvent('newservice://syncmanager/#'+serviceInfo.id, 'new', {title:serviceInfo.title, provider:serviceInfo.provider});
    return serviceInfo;
}

exports.isInstalled = function(serviceId) {
    return serviceId in synclets.installed;
}

exports.status = function(serviceId) {
    return synclets.installed[serviceId];
};

exports.syncNow = function(serviceId, syncletId, post, callback) {
    if(typeof syncletId == "function")
    {
        callback = syncletId;
        syncletId = false;
    }
    if (!synclets.installed[serviceId]) return callback("no service like that installed");
    async.forEach(synclets.installed[serviceId].synclets, function(synclet, cb) {
        if(syncletId && synclet.name != syncletId) return cb();
        if(post)
        {
            if(!Array.isArray(synclet.posts)) synclet.posts = [];
            synclet.posts.push(post);
        }
        executeSynclet(synclets.installed[serviceId], synclet, cb, true);
    }, callback);
};

// run all synclets that have a tolerance and reset them
exports.flushTolerance = function(callback, force) {
    async.forEach(Object.keys(synclets.installed), function(service, cb){ // do all services in parallel
        async.forEachSeries(synclets.installed[service].synclets, function(synclet, cb2) { // do each synclet in series
            if(!force && (!synclet.tolAt || synclet.tolAt == 0)) return cb2();
            synclet.tolAt = 0;
            executeSynclet(synclets.installed[service], synclet, cb2);
        }, cb);
    }, callback);
};

/**
* Add a timeout to run a synclet
*/
var scheduled = {};
function scheduleRun(info, synclet) {
    if (!synclet.frequency) return;

    var key = info.id + "-" + synclet.name;
    if(scheduled[key]) clearTimeout(scheduled[key]); // remove any existing timer

    // run from a clean state
    var force = false;
    function run() {
        delete scheduled[key];
        executeSynclet(info, synclet, function(){}, force);
    }

    // the synclet is paging and needs to run again immediately, forcefully
    if(info.config && info.config.nextRun === -1)
    {
        force = true;
        delete info.config.nextRun;
        return process.nextTick(run);
    }

    // validation check
    if(synclet.nextRun && typeof synclet.nextRun != "number") delete synclet.nextRun;

    // had a schedule and missed it, run it now
    if(synclet.nextRun && synclet.nextRun <= Date.now()) return process.nextTick(run);

    // if no schedule, in the future with 10% fuzz
    if(!synclet.nextRun)
    {
        var milliFreq = parseInt(synclet.frequency) * 1000;
        synclet.nextRun = parseInt(Date.now() + milliFreq + (((Math.random() - 0.5) * 0.1) * milliFreq));
    }
    scheduled[key] = setTimeout(run, synclet.nextRun - Date.now());
}

function localError(base, err)
{
    logger.error(base+"\t"+err);
}

function mergeManifest(js) {
    if (js.srcdir) {
        var dir = path.join(lconfig.lockerDir, js.srcdir);
        var files = fs.readdirSync(dir);
        for (var i = 0; i < files.length; i++) {
            var fullPath = dir + '/' + files[i];
            var stats = fs.statSync(fullPath);
            if (RegExp("\\.synclet$").test(fullPath)) {
                newData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                lutil.extend(true, js, newData);
            }
        }
    }
    return js;
}

/**
* Executes a synclet
*/
function executeSynclet(info, synclet, callback, force) {
    if(!callback) callback = function(){};
    if (synclet.status === 'running') return callback('already running');
    delete synclet.nextRun; // cancel any schedule
    // we're put on hold from running any for some reason, re-schedule them
    // this is a workaround for making synclets available in the map separate from scheduling them which could be done better
    if (!force && !synclets.executeable)
    {
        setTimeout(function() {
            executeSynclet(info, synclet, callback);
        }, 1000);
        return;
    }
    if(!synclet.tolMax){
        synclet.tolAt = 0;
        synclet.tolMax = 0;
    }
    // if we can have tolerance, try again later
    if(!force && synclet.tolAt > 0)
    {
        synclet.tolAt--;
        logger.verbose("tolerance now at "+synclet.tolAt+" synclet "+synclet.name+" for "+info.id);
        scheduleRun(info, synclet);
        return callback();
    }
    logger.info("Synclet "+synclet.name+" starting for "+info.id);
    info.status = synclet.status = "running";
    var run;
    if (!synclet.run) {
        run = ["node", lconfig.lockerDir + "/Common/node/synclet/client.js"];
    } else if (synclet.run.substr(-3) == ".py") {
        run = ["python", lconfig.lockerDir + "/Common/python/synclet/client.py"];
    } else {
        run = ["node", path.join(lconfig.lockerDir, info.srcdir, synclet.run)];
    }

    var dataResponse = '';

    var app = spawn(run.shift(), run, {cwd: path.join(lconfig.lockerDir, info.srcdir)});

    // edge case backup, max 30 min runtime by default
    var timer = setTimeout(function(){
        logger.error("Having to kill long-running "+synclet.name+" synclet of "+info.id);
        info.status = synclet.status = 'failed : timeout';
        process.kill(app.pid); // will fire exit event below and cleanup
    }, (synclet.timeout) ? synclet.timeout : 30*60*1000);

    app.stderr.on('data', function (data) {
        localError(info.title+" "+synclet.name + " error:",data.toString());
    });

    var tstart;
    app.stdout.on('data',function (data) {
        if(!tstart) tstart = Date.now();
        dataResponse += data;
    });

    app.on('exit', function (code,signal) {
        clearTimeout(timer);
        var response;
        try {
            response = JSON.parse(dataResponse);
        } catch (E) {
            if (info.status != 'failed : timeout') {
                localError("Service : " + info.title + ", synclet: "+synclet.name, ". Failed to parse the response from the synclet.  Error was: '" + E + "' and the response from the synclet was '" + dataResponse + "'");
                info.status = synclet.status = 'failed : ' + E;
            }
            if (callback) callback(E);
            return;
        }
        logger.info("Synclet "+synclet.name+" finished for "+info.id+" timing "+(Date.now() - tstart));
        info.status = synclet.status = 'processing data';
        var deleteIDs = compareIDs(info.config, response.config);
        var tempInfo = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir, lconfig.me, info.id, 'me.json')));
        info.auth = lutil.extend(true, tempInfo.auth, response.auth);
        info.config = lutil.extend(true, tempInfo.config, response.config);
        scheduleRun(info, synclet);
        processResponse(deleteIDs, info, synclet, response, function(err, cbresponse) {
            lutil.atomicWriteFileSync(path.join(lconfig.lockerDir, lconfig.me, info.id, 'me.json'),
                                      JSON.stringify(info, null, 4));
            if (callback) callback(err, cbresponse);
        });
    });
    if (!info.config) info.config = {};

    info.syncletToRun = synclet;
    info.syncletToRun.workingDirectory = path.join(lconfig.lockerDir, lconfig.me, info.id);
    info.lockerUrl = lconfig.lockerBase;
    app.stdin.on('error',function(err){
        localError(info.title+" "+synclet.name, "stdin closed: "+err);
    });
    app.stdin.write(JSON.stringify(info)+"\n"); // Send them the process information
    if(synclet.posts) synclet.posts = []; // they're serialized, empty the queue
    delete info.syncletToRun;
};

function compareIDs (originalConfig, newConfig) {
    var resp = {};
    if (originalConfig && originalConfig.ids && newConfig && newConfig.ids) {
        for (var i in newConfig.ids) {
            if (!originalConfig.ids[i]) break;
            var newSet = newConfig.ids[i];
            var oldSet = originalConfig.ids[i];
            var seenIDs = {};
            resp[i] = [];
            for (var j = 0; j < newSet.length; j++) seenIDs[newSet[j]] = true;
            for (var j = 0; j < oldSet.length; j++) {
                if (!seenIDs[oldSet[j]]) resp[i].push(oldSet[j]);
            }
        }
    }
    return resp;
}

function processResponse(deleteIDs, info, synclet, response, callback) {
    datastore.init(function() {
        synclet.status = 'waiting';
        checkStatus(info);

        var dataKeys = [];
        if (typeof(response.data) === 'string') {
            return callback('bad data from synclet');
        }
        for (var i in response.data) {
            if(!Array.isArray(response.data[i])) continue;
            dataKeys.push(i);
        }
        for (var i in deleteIDs) {
            if (!dataKeys[i]) dataKeys.push(i);
        }
        synclet.deleted = synclet.added = synclet.updated = 0;
        async.forEach(dataKeys, function(key, cb) { processData(deleteIDs[key], info, synclet, key, response.data[key], cb); }, function(err){
            if(err) logger.error("err processing data: "+err);
            // here we roughly compromise a multiplier up or down based on the threshold being met
            var threshold = synclet.threshold || lconfig.tolerance.threshold;
            var total = synclet.deleted + synclet.added + synclet.updated;
            if(total < threshold)
            {
                if(synclet.tolMax < lconfig.tolerance.maxstep) synclet.tolMax++; // max 10x scheduled
                synclet.tolAt = synclet.tolMax;
            }else{
                if(synclet.tolMax > 0) synclet.tolMax--;
                synclet.tolAt = synclet.tolMax;
            }
            logger.info("total of "+synclet.added+"+"+synclet.updated+"+"+synclet.deleted+" and threshold "+threshold+" so setting tolerance to "+synclet.tolMax);
            callback(err);
        });
    });
};

function checkStatus(info) {
    for (var i = 0; i < info.synclets.length; i++) {
        if (info.synclets[i].status !== 'waiting') return;
    }
    info.status = 'waiting';
    info.finishedOnce = true;
    lutil.atomicWriteFileSync(path.join(lconfig.lockerDir, lconfig.me, info.id, 'me.json'),
                              JSON.stringify(info, null, 4));

}

function processData (deleteIDs, info, synclet, key, data, callback) {
    // this extra (handy) log breaks the synclet tests somehow??
    var len = (data)?data.length:0;
    var type = (info.types && info.types[key]) ? info.types[key] : key; // try to map the key to a generic data type for the idr
    var idr = lutil.idrNew(type, info.provider, undefined, key, info.id);
    if(len > 0) logger.info("processing synclet data from "+idr+" of length "+len);
    var collection = info.id + "_" + key;

    if (key.indexOf('/') !== -1) {
        console.error("DEPRECIATED, dropping! "+key);
        return callback();
    }

    var mongoId;
    if(typeof info.mongoId === 'string')
        mongoId = info.mongoId
    else if(info.mongoId)
        mongoId = info.mongoId[key + 's'] || info.mongoId[key] || 'id';
    else
        mongoId = 'id';

    datastore.addCollection(key, info.id, mongoId);

    if (deleteIDs && deleteIDs.length > 0 && data) {
        addData(collection, mongoId, data, info, synclet, idr, function(err) {
            if(err) {
                callback(err);
            } else {
                deleteData(collection, mongoId, deleteIDs, info, synclet, idr, callback);
            }
        });
    } else if (data && data.length > 0) {
        addData(collection, mongoId, data, info, synclet, idr, callback);
    } else if (deleteIDs && deleteIDs.length > 0) {
        deleteData(collection, mongoId, deleteIDs, info, synclet, idr, callback);
    } else {
        callback();
    }
}

function deleteData (collection, mongoId, deleteIds, info, synclet, idr, callback) {
    var q = async.queue(function(id, cb) {
        var r = url.parse(idr);
        r.hash = id.toString();
        levents.fireEvent(url.format(r), 'delete');
        synclet.deleted++;
        datastore.removeObject(collection, id, {timeStamp: Date.now()}, cb);
    }, 5);
    deleteIds.forEach(q.push);
    q.drain = callback;
}

function addData (collection, mongoId, data, info, synclet, idr, callback) {
    var errs = [];
    var q = async.queue(function(item, cb) {
        var object = (item.obj) ? item : {obj: item};
        if (object.obj) {
            if(object.obj[mongoId] === null || object.obj[mongoId] === undefined) {
                localError(info.title + ' ' + url.format(idr), "missing primary key (" + mongoId + ") value: "+JSON.stringify(object.obj));
                errs.push({"message":"no value for primary key", "obj": object.obj});
                return cb();
            }
            var r = url.parse(idr);
            r.hash = object.obj[mongoId].toString();
            if (object.type === 'delete') {
                levents.fireEvent(url.format(r), 'delete');
                synclet.deleted++;
                datastore.removeObject(collection, object.obj[mongoId], {timeStamp: object.timestamp}, cb);
            } else {
                var source = r.pathname.substring(1);
                var options = {timeStamp: object.timestamp};
                if(info.strip && info.strip[source]) options.strip = info.strip[source];
                datastore.addObject(collection, object.obj, options, function(err, type, doc) {
                    if (type === 'same') return cb();
                    if (type === 'new') synclet.added++;
                    if (type === 'update') synclet.updated++;
                    levents.fireEvent(url.format(r), type, doc);
                    return cb();
                });
            }
        } else {
            cb();
        }
    }, 5);
    data.forEach(function(d){ q.push(d, errs.push); }); // hehe fun
    q.drain = function() {
        if (errs.length > 0) {
            callback(errs);
        } else {
            callback();
        }
    };
}

/**
* Migrate a service if necessary
*/
exports.migrate = function(installedDir, metaData) {
    if (!metaData.version) { metaData.version = 1; }
    var migrations = [];
    try {
        migrations = fs.readdirSync(metaData.srcdir + "/migrations");
    } catch (E) {}
    if (migrations) {
        for (var i = 0; i < migrations.length; i++) {
            if (migrations[i].substring(0, 13) > metaData.version) {
                try {
                    var cwd = process.cwd();
                    migrate = require(cwd + "/" + metaData.srcdir + "/migrations/" + migrations[i]);
                    logger.info("running synclet migration : " + migrations[i] + " for service " + metaData.title);
                    if (migrate(installedDir)) {
                        var curMe = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir, installedDir, 'me.json'), 'utf8'));
                        lutil.extend(true, metaData, curMe);
                        metaData.version = migrations[i].substring(0, 13);
                        lutil.atomicWriteFileSync(path.join(lconfig.lockerDir, installedDir, 'me.json'),
                                                  JSON.stringify(metaData, null, 4));
                    }
                    process.chdir(cwd);
                } catch (E) {
                    logger.error("error running migration : " + migrations[i] + " for service " + metaData.title + " ---- " + E);
                    process.chdir(cwd);
                }
            }
        }
    }
    return;
}

/**
* Map a meta data file JSON with a few more fields and make it available
*/
function mapMetaData(file) {
    var metaData = JSON.parse(fs.readFileSync(file, 'utf8'));
    metaData.srcdir = path.dirname(file);
    synclets.available.push(metaData);
    return metaData;
}

function addUrls() {
    if (path.existsSync(path.join(lconfig.lockerDir, "Config", "apikeys.json"))) {
        var apiKeys = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir, "Config", "apikeys.json"), 'utf-8'));
        var host = lconfig.externalBase + "/";
        for (var i in synclets.available) {
            var synclet = synclets.available[i];
            if(!apiKeys[synclet.provider]) continue;
            var authModule = require(path.join(lconfig.lockerDir, synclet.srcdir, 'auth.js'));
            if(authModule.authUrl) {
                synclet.authurl = authModule.authUrl + "&client_id=" + apiKeys[synclet.provider].appKey +
                                    "&redirect_uri=" + host + "auth/" + synclet.provider + "/auth";
            } else {
                synclet.authurl = host + "auth/" + synclet.provider + "/auth";
            }
        }
    }
}
