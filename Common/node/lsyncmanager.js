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




// core syncmanager init function, need to talk to serviceManager
var serviceManager;
exports.init = function(sman, callback)
{
    serviceManager = sman;
    datastore.init(callback);
}

var executeable = true;
exports.setExecuteable = function(e)
{
    executeable = e;
}

exports.syncNow = function(serviceId, syncletId, post, callback) {
    if(typeof syncletId == "function")
    {
        callback = syncletId;
        syncletId = false;
    }
    var js = serviceManager.map(serviceId);
    if (!js || !js.synclets) return callback("no synclets like that installed");
    async.forEach(js.synclets, function(synclet, cb) {
        if(syncletId && synclet.name != syncletId) return cb();
        if(post)
        {
            if(!Array.isArray(synclet.posts)) synclet.posts = [];
            synclet.posts.push(post);
        }
        executeSynclet(js, synclet, cb, true);
    }, callback);
};

// run all synclets that have a tolerance and reset them
exports.flushTolerance = function(callback, force) {
    var map = serviceManager.map();
    async.forEach(Object.keys(map), function(service, cb){ // do all services in parallel
        if(!map[service].synclets) return cb();
        async.forEachSeries(map[service].synclets, function(synclet, cb2) { // do each synclet in series
            if(!force && (!synclet.tolAt || synclet.tolAt == 0)) return cb2();
            synclet.tolAt = 0;
            executeSynclet(map[service], synclet, cb2);
        }, cb);
    }, callback);
};

/**
* Add a timeout to run a synclet
*/
var scheduled = {};
exports.scheduleRun = function(info, synclet) {
    synclet.status = "waiting";
    if (!synclet.frequency) return;

    var key = info.id + "-" + synclet.name;
    logger.verbose("scheduling "+key);
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

/**
* Executes a synclet
*/
function executeSynclet(info, synclet, callback, force) {
    if(!callback) callback = function(err){
        if(err) return logger.error(err);
        logger.debug("finished processing "+synclet.name);
    };
    if (synclet.status === 'running') return callback('already running');
    delete synclet.nextRun; // cancel any schedule
    // we're put on hold from running any for some reason, re-schedule them
    // this is a workaround for making synclets available in the map separate from scheduling them which could be done better
    if (!force && !executeable)
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
        exports.scheduleRun(info, synclet);
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
        info.auth = lutil.extend(true, info.auth, response.auth); // for refresh tokens
        info.config = lutil.extend(true, info.config, response.config);
        exports.scheduleRun(info, synclet);
        serviceManager.mapDirty(info.id); // save out to disk
        processResponse(deleteIDs, info, synclet, response, callback);
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


