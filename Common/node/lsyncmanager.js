var fs = require('fs')
  , path = require('path')
  , lconfig = require("lconfig")
  , spawn = require('child_process').spawn
  , IJOD = require('ijod').IJOD
  , async = require('async')
  , url = require('url')
  , lutil = require('lutil')
  , EventEmitter = require('events').EventEmitter
  , levents = require(__dirname + '/levents')
  , logger = require("./logger.js")
  , vm = require('vm')
  , util = require('util')
  , dispatcher = require('./instrument.js').StatsdDispatcher
  , stats = new dispatcher(lconfig.stats);

var PAGIN_TIMING = 2000; // 2s gap in paging

var runningContexts = {}; // Map of a synclet to a running context

function SyncletManager()
{
  this.scheduled = {};
  this.offlineMode = false;
}
/// Schedule a synclet to run
/**
* timeToRun is optional.  In this case the next run time is calculated 
* based on normal frequency and tolerance methods.
*/
SyncletManager.prototype.schedule = function(connectorInfo, syncletInfo, timeToRun) {
  var key = this.getKey(connectorInfo, syncletInfo);
  // Let's get back to a clean slate on this synclet
  if (this.scheduled[key]) {
    logger.debug(key + " was already scheduled.");
    this.cleanup(connectorInfo, syncletInfo);
  }
  syncletInfo.status = "waiting";
  if (!syncletInfo.frequency) return;

  // In offline mode things may only be ran directly with runAndReschedule
  if (this.offlineMode) return;
 
  // validation check
  if(syncletInfo.nextRun && typeof syncletInfo.nextRun != "number") delete syncletInfo.nextRun;

  if (timeToRun === undefined) {
    // had a schedule and missed it, run it now
    if(syncletInfo.nextRun && syncletInfo.nextRun <= Date.now()) {
      logger.verbose("scheduling " + key + " to run immediately (missed)");
      timeToRun = 0;
    } else if (!syncletInfo.nextRun) {
      // if not scheduled yet, schedule it to run in the future
      var milliFreq = parseInt(syncletInfo.frequency) * 1000;
      syncletInfo.nextRun = parseInt(Date.now() + milliFreq + (((Math.random() - 0.5) * 0.5) * milliFreq)); // 50% fuzz added or subtracted
      timeToRun = syncletInfo.nextRun - Date.now();
    }
  }

  logger.verbose("scheduling " + key + " (freq " + syncletInfo.frequency + "s) to run in " + (timeToRun / 1000) + "s");
  var self = this;
  this.scheduled[key] = setTimeout(function() {
    self.runAndReschedule(connectorInfo, syncletInfo);
  }, timeToRun);
};
/// Remove the synclet from scheduled and cleanup all other state, does not reset it to run again
SyncletManager.prototype.cleanup = function(connectorInfo, syncletInfo) {
  var key = this.getKey(connectorInfo, syncletInfo);
  if (this.scheduled[key]) {
    clearTimeout(this.scheduled[key]); // remove any existing timer
    delete this.scheduled[key];
  }
};
/// Run the synclet and then attempt to reschedule it
SyncletManager.prototype.runAndReschedule = function(connectorInfo, syncletInfo, callback) {
  //TODO:  Ensure that we only run one per connector at a time.
  delete syncletInfo.nextRun; // We're going to run and get a new time, so reset
  this.cleanup(connectorInfo, syncletInfo);
  var self = this;
  // Tolerance isn't done yet, we'll come back
  if (!this.checkToleranceReady(connectorInfo, syncletInfo)) {
    return self.schedule(connectorInfo, syncletInfo);
  }
  executeSynclet(connectorInfo, syncletInfo, function(error) {
    var nextRunTime = undefined;
    if (connectorInfo.config && connectorInfo.config.nextRun < 0) {
      // This wants to page so we'll schedule it for anther run in just a short gap.
      nextRunTime = PAGING_TIMING;
    }
    // Make sure we reschedule this before we return anything else
    self.schedule(connectorInfo, syncletInfo, nextRunTime);
    if (callback) return callback(error);
  });
};
/// Return true if the tolerance is ready for us to actually run
SyncletManager.prototype.checkToleranceReady = function(connectorInfo, syncletInfo) {
  // Make sure the baseline is there
  if (syncletInfo.tolMax === undefined) {
    syncletInfo.tolAt = 0;
    syncletInfo.tolMax = 0;
  }
  // if we can have tolerance, try again later
  if(syncletInfo.tolAt > 0) {
    syncletInfo.tolAt--;
    logger.verbose("tolerance now at " + syncletInfo.tolAt + " synclet " + syncletInfo.name + " for " + connectorInfo.id);
    return false;
  }
  return true;
};
// This trivial helper function just makes sure we're consistent and we can change it easly
SyncletManager.prototype.getKey = function(connectorInfo, syncletInfo) {
  return connectorInfo.id + "-" + syncletInfo.name;
};

syncletManager = new SyncletManager();

var ijods = {};

// core syncmanager init function, need to talk to serviceManager
var serviceManager;
exports.init = function (sman, callback) {
    serviceManager = sman;
    callback();
};

var executeable = true;
exports.setExecuteable = function (e) {
    executeable = e;
};

// Run a connector or a specific synclet right now
exports.syncNow = function (serviceId, syncletId, post, callback) {
  if(typeof syncletId == "function") {
    callback = syncletId;
    syncletId = false;
  }

  var js = serviceManager.map(serviceId);
  if (!js || !js.synclets) return callback("no synclets like that installed");
  async.forEachSeries(js.synclets, function (synclet, cb) {
    if (!synclet) {
      logger.error("Unknown synclet info in syncNow");
      return cb();
    }
    // If they requested a specific synclet we'll skip everything but that one
    if(syncletId && synclet.name != syncletId) return cb();
    if(post) {
      if(!Array.isArray(synclet.posts)) synclet.posts = [];
      synclet.posts.push(post);
    }
    syncletManager.runAndReschedule(js, synclet, cb);
  }, callback);
};

// run all synclets that have a tolerance and reset them
exports.flushTolerance = function(callback, force) {
  // TODO:  This now has an implied force, is that correct, why wouldn't you want this to force?
  var map = serviceManager.map();
  async.forEach(Object.keys(map), function(service, cb){ // do all services in parallel
    // We only want services with synclets
    if(!map[service].synclets) return cb();
    async.forEachSeries(map[service].synclets, function(synclet, cb2) { // do each synclet in series
      synclet.tolAt = 0;
      syncletManager.runAndReschedule(map[service], synclet, cb2);
    }, cb);
  }, callback);
};

/**
* Add a timeout to run a synclet
* DEPRECATE:  Use the syncletManager.schedule directly
*/
exports.scheduleRun = function(info, synclet) {
  logger.warn("Deprecated use of scheduleRun");
  console.trace();
  syncletManager.schedule(info, synclet);
};

// Find al the synclets and get their initial scheduling done
exports.scheduleAll = function(callback) {
  var map = serviceManager.map();
  async.forEach(Object.keys(map), function(service, cb){ // do all services in parallel
    // We only want services with synclets
    if(!map[service].synclets) return cb();
    async.forEach(map[service].synclets, function(synclet, cb2) { // do each synclet in series
      syncletManager.schedule(map[service], synclet);
      cb2();
    }, cb);
  }, callback);
};

function localError(base, err) {
    logger.error(base+"\t"+err);
}

/**
* Executes a synclet
*/
function executeSynclet(info, synclet, callback) {
    if(!callback) callback = function(err){
        if(err) return logger.error(err);
        logger.debug("finished processing "+synclet.name);
    };
    if (synclet.status === 'running') return callback('already running');
    if(!info.auth || !info.authed) return callback("no auth info for "+info.id);
    // if another synclet is running, come back a little later, don't overlap!
    if (info.status == 'running' || runningContexts[info.id + "/" + synclet.name]) {
        logger.verbose("delaying "+synclet.name);
        setTimeout(function() {
            executeSynclet(info, synclet, callback);
        }, 10000);
        return;
    }
    logger.info("Synclet "+synclet.name+" starting for "+info.id);
    info.status = synclet.status = "running";
    var tstart = Date.now();
    stats.increment('synclet.' + info.id + '.' + synclet.name + '.start');
    stats.increment('synclet.' + info.id + '.' + synclet.name + '.running');
    // This is super handy for testing.
    /*
    var fname = path.join("tmp", info.id + "-" + synclet.name + ".json");
    if (path.existsSync(fname)) {
      var resp = JSON.parse(fs.readFileSync(fname));
      var startTime = Date.now();
      console.log("Start response processing for %s", (info.id + "/" + synclet.name));
      processResponse({}, info, synclet, resp, function(processErr) {
        process.stdin.on("data", function(data) {
          console.log(data.toString());
        });
        console.log("Response Processing Done for %s in %d", (info.id + "/" + synclet.name), (Date.now() - startTime));
        info.status = 'waiting';
        callback(processErr);
      });
      return;
    }
    */

    if (info.vm || synclet.vm) {
      // Go ahead and create a context immediately so we get it listed as
      // running and dont' start mulitple ones
      var sandbox = {
        // XXX: This could be a problem later and need a cacheing layer to
        // remove anything that they add, but for now we'll allow it
        // direct and see the impact
        require:require,
        console:console,
        logger:logger,
        exports:{}
      };
      var context = vm.createContext(sandbox);
      runningContexts[info.id + "/" + synclet.name] = context;
      // Let's get the code loaded
      var fname = path.join(info.srcdir, synclet.name + ".js");
      try {
        var code = fs.readFileSync(fname);
        if (!code) {
          logger.error("Unable to load synclet " + synclet.name + "/" + info.id + ": " + err);
          return callback(err);
        }
        synclet.deleted = synclet.added = synclet.updated = 0;
        vm.runInContext(code, context, fname);

        if (!info.config) info.config = {};

        if (!info.absoluteSrcdir) info.absoluteSrcdir = path.join(lconfig.lockerDir, info.srcdir);
        if (!info.workingDirectory) info.workingDirectory = path.join(lconfig.lockerDir, lconfig.me, info.id);
        synclet.workingDirectory = info.workingDirectory; // legacy?
        info.syncletToRun = synclet;
        info.lockerUrl = lconfig.lockerBase;
        sandbox.exports.sync(info, function(syncErr, response) {
          delete runningContexts[info.id + "/" + synclet.name];
          if (syncErr) {
            logger.error(synclet.name+" error: "+util.inspect(syncErr));
            info.status = synclet.status = 'failed';
            return callback(syncErr);
          }
          var elapsed = Date.now() - tstart;
          stats.increment('synclet.' + info.id + '.' + synclet.name + '.stop');
          stats.decrement('synclet.' + info.id + '.' + synclet.name + '.running');
          stats.timing('synclet.' + info.id + '.' + synclet.name + '.timing', elapsed);
          logger.info("Synclet "+synclet.name+" finished for "+info.id+" timing "+elapsed);
          info.status = synclet.status = 'processing data';
          var deleteIDs = compareIDs(info.config, response.config);
          info.auth = lutil.extend(true, info.auth, response.auth); // for refresh tokens and profiles
          info.config = lutil.extend(true, info.config, response.config);
          //exports.scheduleRun(info, synclet);
          serviceManager.mapDirty(info.id); // save out to disk
          processResponse(deleteIDs, info, synclet, response, function(processErr) {
            info.status = 'waiting';
            callback(processErr);
          });
        });
      } catch (E) {
        logger.error("Error running " + synclet.name + "/" + info.id + " in a vm context: " + E);
        return callback(E);
      }
      if(synclet.posts) synclet.posts = []; // they're serialized, empty the queue
      delete info.syncletToRun;
      return;
    }
    var run;
    var env = process.env;
    if (!synclet.run) {
        env["NODE_PATH"] = path.join(lconfig.lockerDir, 'Common', 'node') + ":" + path.join(lconfig.lockerDir, "node_modules");
        run = ["node", lconfig.lockerDir + "/Common/node/synclet/client.js"];
    } else if (synclet.run.substr(-3) == ".py") {
        env["PYTHONPATH"] = path.join(lconfig.lockerDir, 'Common', 'python');
        run = ["python", lconfig.lockerDir + "/Common/python/synclet/client.py"];
    } else {
        env["NODE_PATH"] = path.join(lconfig.lockerDir, 'Common', 'node') + ":" + path.join(lconfig.lockerDir, "node_modules");
        run = ["node", path.join(lconfig.lockerDir, info.srcdir, synclet.run)];
    }

    var dataResponse = '';
    var cwd = (info.srcdir.charAt(0) == '/') ? info.srcdir : path.join(lconfig.lockerDir, info.srcdir);
    var app = spawn(run.shift(), run, {cwd: cwd, env:env});

    // edge case backup, max 30 min runtime by default
    var timer = setTimeout(function(){
        logger.error("Having to kill long-running "+synclet.name+" synclet of "+info.id);
        info.status = synclet.status = 'failed : timeout';
        process.kill(app.pid); // will fire exit event below and cleanup
    }, (synclet.timeout) ? synclet.timeout : 30*60*1000);

    app.stderr.on('data', function (data) {
        localError(info.title+" "+synclet.name + " error:",data.toString());
    });

    app.stdout.on('data',function (data) {
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
        var elapsed = Date.now() - tstart;
        stats.increment('synclet.' + info.id + '.' + synclet.name + '.stop');
        stats.decrement('synclet.' + info.id + '.' + synclet.name + '.running');
        stats.timing('synclet.' + info.id + '.' + synclet.name + '.timing', elapsed);
        logger.info("Synclet "+synclet.name+" finished for "+info.id+" timing "+elapsed);
        info.status = synclet.status = 'processing data';
        var deleteIDs = compareIDs(info.config, response.config);
        info.auth = lutil.extend(true, info.auth, response.auth); // for refresh tokens and profiles
        info.config = lutil.extend(true, info.config, response.config);
        //exports.scheduleRun(info, synclet);
        serviceManager.mapDirty(info.id); // save out to disk
        processResponse(deleteIDs, info, synclet, response, function(err){
            info.status = 'waiting';
            callback(err);
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
}

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
        if (total < threshold)
        {
            if(synclet.tolMax < lconfig.tolerance.maxstep) synclet.tolMax++; // max 10x scheduled
            synclet.tolAt = synclet.tolMax;
        } else {
            if(synclet.tolMax > 0) synclet.tolMax--;
            synclet.tolAt = synclet.tolMax;
        }
        stats.increment('synclet.' + info.id + '.' + synclet.name + '.added',   synclet.added);
        stats.increment('synclet.' + info.id + '.' + synclet.name + '.updated', synclet.updated);
        stats.increment('synclet.' + info.id + '.' + synclet.name + '.deleted', synclet.deleted);
        stats.increment('synclet.' + info.id + '.' + synclet.name + '.length',  dataKeys.reduce(function(prev, cur, idx, arr) { return prev + response.data[cur].length; }, 0));
        logger.info("total of "+synclet.added+"+"+synclet.updated+"+"+synclet.deleted+" and threshold "+threshold+" so setting tolerance to "+synclet.tolMax);
        callback(err);
    });
}

// simple async friendly wrapper
function getIJOD(id, key, create, callback) {
    var name = path.join(lconfig.lockerDir, lconfig.me, id, key);
    //console.log("Open IJOD %s", name);
    if(ijods[name]) return callback(ijods[name]);
    // only load if one exists or create flag is set
    fs.stat(name+".db", function(err, stat){
        if(!stat && !create) return callback();
        var ij = new IJOD({name:name})
        ijods[name] = ij;
        ij.open(function(err){
            if(err) logger.error(err);
            return callback(ij);
        });
    });
}
exports.getIJOD = getIJOD;

function closeIJOD(id, key, callback) {
  var name = path.join(lconfig.lockerDir, lconfig.me, id, key);
  //console.log("Close IJOD %s", name);
  if (ijods[name]) {
    ijods[name].close(function(error) {
      delete ijods[name];
      callback();
    });
  } else {
    callback();
  }
}
exports.closeIJOD = closeIJOD;

function processData (deleteIDs, info, synclet, key, data, callback) {
    // this extra (handy) log breaks the synclet tests somehow??
    var len = (data)?data.length:0;
    var type = (info.types && info.types[key]) ? info.types[key] : key; // try to map the key to a generic data type for the idr
    var idr = lutil.idrNew(type, info.provider, undefined, key, info.id);
    if(len > 0) logger.info("processing synclet data from "+idr+" of length "+len);
    var collection = info.id + "_" + key;

    if (key.indexOf('/') !== -1) {
        console.error("DEPRECATED, dropping! "+key);
        return callback();
    }

    var mongoId;
    if (typeof info.mongoId === 'string') mongoId = info.mongoId;
    else if (info.mongoId) mongoId = info.mongoId[key + 's'] || info.mongoId[key] || 'id';
    else mongoId = 'id';

    getIJOD(info.id, key, true, function(ij){
      function finish(err) {
        closeIJOD(info.id, key, function() {
          return callback(err);
        });
      }
        if (deleteIDs && deleteIDs.length > 0 && data) {
            addData(collection, mongoId, data, info, synclet, idr, ij, function(err) {
                if(err) {
                    finish(err);
                } else {
                    deleteData(collection, mongoId, deleteIDs, info, synclet, idr, ij, finish);
                }
            });
        } else if (data && data.length > 0) {
          addData(collection, mongoId, data, info, synclet, idr, ij, function(err) {
            finish();
          });
        } else if (deleteIDs && deleteIDs.length > 0) {
            deleteData(collection, mongoId, deleteIDs, info, synclet, idr, ij, finish);
        } else {
            finish();
        }
    });
}

function deleteData (collection, mongoId, deleteIds, info, synclet, idr, ij, callback) {
    var q = async.queue(function(id, cb) {
        var r = url.parse(idr);
        r.hash = id.toString();
        levents.fireEvent(url.format(r), 'delete');
        synclet.deleted++;
        ij.delData({id:id}, cb);
    }, 5);
    // debug stuff
    var oldProcess = q.process;
    q.process = function() {
      var task = q.tasks[0];
      try {
        oldProcess();
      } catch (err) {
        console.error('ERROR: caught error while processing q on task ', task);
      }
    };
    deleteIds.forEach(q.push);
    q.drain = callback;
}

function addData (collection, mongoId, data, info, synclet, idr, ij, callback) {
  var errs = [];
  // Take out the deletes
  var deletes = data.filter(function(item) {
    var object = (item.obj) ? item : {obj: item};
    if (object.obj && object.type === "delete") {
      return true;
    }
    return false;
  });
  // TODO The deletes
  async.forEachSeries(deletes, function(item, cb) {
    var r = url.parse(idr);
    r.hash = object.obj[mongoId].toString();
    levents.fireEvent(url.format(r), 'delete');
    synclet.deleted++;
    ij.delData({id:object.obj[mongoId]}, cb);
  }, function(err) {
    // Now we'll batch process the rest as adds
    var entries = data.filter(function(item) {
      var object = (item.obj) ? item : {obj: item};
      if (object.obj && object.type === "delete") {
        return false;
      }
      return true; 
    });
    entries = entries.map(function(item) { 
      var object = (item.obj) ? item : {obj: item};
      return {id:object.obj[mongoId], data:object.obj};
    });
    ij.batchSmartAdd(entries, function() {
      // TODO:  Return some stats from batch add for added and updated
      entries.forEach(function(item) {
        var r = url.parse(idr);
        r.hash = item.toString();
        levents.fireEvent(url.format(r), "new", item.data);
      });
      callback();
    });
  });
}


