var fs = require('fs')
  , path = require('path')
  , lconfig = require("lconfig")
  , spawn = require('child_process').spawn
  , datastore = require('./synclet/datastore')
  , async = require('async')
  , lutil = require('lutil')
  , EventEmitter = require('events').EventEmitter
  ;

var synclets = {};

exports.eventEmitter = new EventEmitter();

exports.synclets = function() {
  return synclets;
};

/**
* Scans the Me directory for instaled synclets
*/
exports.findInstalled = function () {
    var dirs = fs.readdirSync(lconfig.me);
    for (var i = 0; i < dirs.length; i++) {
        var dir =  lconfig.me + '/' + dirs[i];
        try {
            if(!fs.statSync(dir).isDirectory()) continue;
            if(!path.existsSync(dir+'/synclets.json')) continue;
            var js = JSON.parse(fs.readFileSync(dir+'/me.json', 'utf-8'));
            js.sync = JSON.parse(fs.readFileSync(dir+'/synclets.json', 'utf-8'));
            console.log("Loaded synclets for "+dirs[i]);
            js.sync.status = "waiting";
            synclets[js.id] = js;
            if (js.sync.synclets) {
                for (var j = 0; j < js.sync.synclets.length; j++) {
                    scheduleRun(js, js.sync.synclets[j]);
                }
            }
        } catch (E) {
            console.log("Me/"+dirs[i]+" failed to load synclets (" +E+ ")");
        }
    }
}


/**
* Install a synclet, serviceId="connector",auth={},synclets=[]
*/
exports.install = function(serviceId,auth,newSynclets) {
    // can be new or existing synclets for this connector
    if(!synclets[serviceId])
    {
        synclets[serviceId] = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir, lconfig.me, serviceId, 'me.json'), 'utf-8'));
        synclets[serviceId].sync = {auth:auth,synclets:newSynclets,config:{}};
    }else{
        // merge into existing
        synclets[serviceId].sync.synclets = synclets[serviceId].sync.synclets.concat(newSynclets);
    }
    fs.writeFileSync(path.join(lconfig.lockerDir, lconfig.me, serviceId, 'synclets.json'),JSON.stringify(synclets[serviceId].sync, null, 4));
    for (var i = 0; i < newSynclets.length; i++) {
        scheduleRun(synclets[serviceId], newSynclets[i]);
    }
}

exports.isInstalled = function(serviceId) {
    return serviceId in synclets;
}

exports.status = function(serviceId) {
    return (exports.isInstalled(serviceId))?synclets[serviceId].sync:false;
};

exports.syncNow = function(serviceId, callback) {
    if (!synclets[serviceId]) return callback("no service like that installed");
    async.forEach(synclets[serviceId].sync.synclets, function(synclet, cb) { executeSynclet(synclets[serviceId], synclet, cb); }, callback);
};

/**
* Add a timeout to run a synclet
*/
function scheduleRun(info, synclet) {
    // TODO if there is a .nextRun and it's past-due, run it now!
    synclet.nextRun = new Date(Date.now() + (parseInt(synclet.frequency) * 1000));
    setTimeout(function() {
        executeSynclet(info, synclet);
    }, parseInt(synclet.frequency) * 1000);
};

/**
* Executes a synclet
*/
function executeSynclet(info, synclet, callback) {
    if (synclet.status === 'running') {
        if (callback) {
            callback('already running');
        }
        return;
    }
    console.log("Running synclet "+synclet.name+" for "+info.id);
    info.sync.status = synclet.status = "running";
    if (!synclet.run) {
        run = ["node", lconfig.lockerDir + "/Common/node/synclet/client.js"];
    } else {
        run = synclet.run.split(" "); // node foo.js
    }

    process.env["NODE_PATH"] = lconfig.lockerDir+'/Common/node/';
    var dataResponse = '';

    // app = spawn(run.shift(), run, {cwd: lconfig.lockerDir + '/' + lconfig.me + '/synclets/' + info.id, env:process.env});
    app = spawn(run.shift(), run, {cwd: info.srcdir, env: process.env});
    
    app.stderr.on('data', function (data) {
        var mod = console.outputModule;
        console.outputModule = info.title+" "+synclet.name;
        console.error(data.toString());
        console.outputModule = mod;
    });

    app.stdout.on('data',function (data) {
        console.log("got data from synclet "+synclet.name);
        dataResponse += data;
    });
    
    app.on('exit', function (code,signal) {
        console.log("got exit from synclet "+synclet.name);
        var response;
        try {
            response = JSON.parse(dataResponse);
        } catch (E) {
            console.error(E);
            console.error(dataResponse);
            info.status = synclet.status = 'failed : ' + E;
            if (callback) callback(E);
            return;
        }
        info.sync.status = synclet.status = 'processing data';
        var deleteIDs = compareIDs(info.sync.config, response.config);
        processResponse(deleteIDs, info, synclet, response, callback);
        info.sync.config = lutil.extend(info.sync.config, response.config);
        fs.writeFileSync(path.join(lconfig.lockerDir, lconfig.me, info.id, 'synclets.json'),JSON.stringify(info.sync, null, 4));
        scheduleRun(info, synclet);
    });
    
    var boot = {
        name: synclet.name,
        workingDirectory: lconfig.lockerDir + '/' + lconfig.me + '/' + info.id,
        sourceDirectory: lconfig.lockerDir + info.srcdir,
        auth: info.sync.auth,
        config: info.sync.config
    }
    app.stdin.write(JSON.stringify(boot)+"\n"); // Send them the process information
};

function compareIDs (originalConfig, newConfig) {
    var resp = {};
    if (originalConfig.ids && newConfig.ids) {
        for (var i in newConfig.ids) {
            if (!originalConfig.ids[i]) break;
            var newSet = newConfig.ids[i];
            var oldSet = originalConfig.ids[i];
            seenIDs = {};
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
        info.sync.status = synclet.status = 'waiting';

        if (!callback) {
            callback = function() {};
        }
        var dataKeys = [];
        for (var i in response.data) {
            dataKeys.push(i);
        }
        for (var i in deleteIDs) {
            if (!dataKeys[i]) dataKeys.push(i);
        }
        async.forEach(dataKeys, function(key, cb) { processData(deleteIDs[key], info, key, response.data[key], cb); }, callback);
    });
};

function processData (deleteIDs, info, key, data, callback) {
    // console.error(deleteIDs);
    var collection = info.id + "_" + key;
    var eventType = key + "/" + info.handle;
    
    if (key.indexOf('/') !== -1) {
        collection = info.id + "_" + key.substring(key.indexOf('/') + 1);
        eventType = key.substring(0, key.indexOf('/')) + "/" + info.handle;
        key = key.substring(key.indexOf('/') + 1);
    }

    datastore.addCollection(key, info.id, "id");
    
    if (deleteIDs && deleteIDs.length > 0 && data) {
        addData(collection, data, info, eventType, function() {
            deleteData(collection, deleteIDs, info, eventType, callback);
        });
    } else if (data) {
        addData(collection, data, info, eventType, callback);
    } else if (deleteIDs && deleteIDs.length > 0) {
        deleteData(collection, deleteIDs, info, eventType, callback);
    } else {
        callback();
    }
}

function deleteData (collection, deleteIds, info, eventType, callback) {
    async.forEach(deleteIds, function(id, cb) {
        var newEvent = {obj : {source : eventType, type: 'delete', data : {}}};
        newEvent.obj.data["id"] = id;
        newEvent.fromService = "synclet/" + info.id;
        exports.eventEmitter.emit(eventType, newEvent);
        datastore.removeObject(collection, id, {timeStampe: Date.now()}, cb);
    }, callback);
}

function addData (collection, data, info, eventType, callback) {
    async.forEach(data, function(object, cb) {
        var newEvent = {obj : {source : collection, type: object.type, data: object.obj}};
        newEvent.fromService = "synclet/" + info.id;
        if (object.type === 'delete') {
            datastore.removeObject(collection, object.obj["id"], {timeStamp: object.timestamp}, cb);
            exports.eventEmitter.emit(eventType, newEvent);
        } else {
            datastore.addObject(collection, object.obj, {timeStamp: object.timestamp}, function(err, type) {
                if (type === 'same') return cb();
                newEvent.obj.type = type;
                exports.eventEmitter.emit(eventType, newEvent);
                cb();
            });
        }
    }, callback);
}
