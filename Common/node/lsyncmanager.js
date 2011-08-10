var fs = require('fs')
  , path = require('path')
  , lconfig = require("lconfig")
  , spawn = require('child_process').spawn
  , datastore = require('./synclet/datastore')
  , async = require('async')
  , lutil = require('lutil')
  , EventEmitter = require('events').EventEmitter
  ;

var synclets = {
    available:[],
    installed:{}
};

exports.eventEmitter = new EventEmitter();

exports.synclets = function() {
  return synclets;
};

/**
* Scans the Me directory for instaled synclets
*/
exports.findInstalled = function () {
    synclets.installed = {};
    if (!path.existsSync(lconfig.me + "/synclets/")) fs.mkdirSync(lconfig.me + "/synclets/", 0755);
    var dirs = fs.readdirSync(lconfig.me + "/synclets/" );
    for (var i = 0; i < dirs.length; i++) {
        var dir =  lconfig.me + '/synclets/' + dirs[i];
        try {
            if(!fs.statSync(dir).isDirectory()) continue;
            if(!fs.statSync(dir+'/me.json').isFile()) continue;
            var js = JSON.parse(fs.readFileSync(dir+'/me.json', 'utf-8'));
            synclets.installed[js.id] = js;
            synclets.installed[js.id].status = "waiting";
            if (js.synclets) {
                for (var i = 0; i < js.synclets.length; i++) {
                    scheduleRun(js, js.synclets[i]);
                }
            }
        } catch (E) {
            console.log("Me/synclets/"+dirs[i]+" does not appear to be a synclet (" +E+ ")");
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
            return true;
        }
        return false;
    });
    if (!serviceInfo) return serviceInfo;
    var authInfo;
    // local/internal name for the service on disk and whatnot, try to make it more friendly to devs/debugging
    if(serviceInfo.provider) {
        try {
            var apiKeys = JSON.parse(fs.readFileSync(lconfig.lockerDir + "/" + lconfig.me + "/apikeys.json", 'ascii'));
            authInfo = apiKeys[serviceInfo.provider];
        } catch (E) { console.dir(E); }
        var inc = 0;
        if (path.existsSync(path.join(lconfig.lockerDir, lconfig.me, 'synclets', serviceInfo.provider))) {
            inc++;
            while (path.existsSync(path.join(lconfig.lockerDir, lconfig.me, 'synclets', serviceInfo.provider + '-' + inc))) inc++;
            serviceInfo.id = serviceInfo.provider + "-" + inc;
        } else {
            serviceInfo.id = serviceInfo.provider;
        }
    } else {
        throw "invalid synclet, has no provider";
    }
    synclets.installed[serviceInfo.id] = serviceInfo;
    fs.mkdirSync(path.join(lconfig.lockerDir, lconfig.me, "synclets", serviceInfo.id),0755);
    if (authInfo) serviceInfo.auth = authInfo;
    fs.writeFileSync(path.join(lconfig.lockerDir, lconfig.me, "synclets", serviceInfo.id, 'me.json'),JSON.stringify(serviceInfo, null, 4));
    if (serviceInfo.synclets) {
        for (var i = 0; i < serviceInfo.synclets; i++) {
            scheduleRun(serviceInfo, serviceInfo.synclets[i]);
        }
    }
    return serviceInfo;
}

exports.isInstalled = function(serviceId) {
    return serviceId in synclets.installed;
}

exports.status = function(serviceId) {
    return synclets.installed[serviceId];
};

exports.syncNow = function(serviceId, callback) {
    if (!synclets.installed[serviceId]) return callback("no service like that installed");
    async.forEach(synclets.installed[serviceId].synclets, function(synclet, cb) { executeSynclet(synclets.installed[serviceId], synclet, cb); }, callback);
};

/**
* Add a timeout to run a synclet
*/
function scheduleRun(info, synclet) {
    info.nextRun = new Date() + parseInt(info.frequency);
    synclet.nextRun = new Date() + parseInt(synclet.frequency);
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
    info.status = synclet.status = "running";
    if (!synclet.run) {
        run = ["node", lconfig.lockerDir + "/Common/node/synclet/client.js"];
    } else {
        run = synclet.run.split(" "); // node foo.js
    }

    process.env["NODE_PATH"] = lconfig.lockerDir+'/synclets';
    var dataResponse = '';

    // app = spawn(run.shift(), run, {cwd: lconfig.lockerDir + '/' + lconfig.me + '/synclets/' + info.id, env:process.env});
    app = spawn(run.shift(), run, {cwd: info.srcdir, env:process.env});
    
    app.stderr.on('data', function (data) {
        var mod = console.outputModule;
        console.outputModule = info.title;
        console.error(data.toString());
        console.outputModule = mod;
    });

    app.stdout.on('data',function (data) {
        dataResponse += data;
    });
    
    app.on('exit', function (code,signal) {
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
        info.status = synclet.status = 'processing data';
        tempInfo = JSON.parse(fs.readFileSync(lconfig.lockerDir + "/" + lconfig.me + "/synclets/" + info.id + '/me.json'));
        var deleteIDs = compareIDs(info.config, response.config);
        processResponse(deleteIDs, info, synclet, response, callback);
        info.config = lutil.extend(tempInfo.config, response.config);
        fs.writeFileSync(lconfig.lockerDir + "/" + lconfig.me + "/synclets/" + info.id + '/me.json', JSON.stringify(info, null, 4));
        scheduleRun(info, synclet);
    });
    if (!info.config) info.config = {};
    
    info.syncletToRun = synclet;
    app.stdin.write(JSON.stringify(info)+"\n"); // Send them the process information
    delete info.syncletToRun;
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
        info.status = synclet.status = 'waiting';

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
    // console.error(key);
    // console.error(deleteIDs);
    
    if (info.mongoId) { 
        datastore.addCollection(key, info.id, info.mongoId);
    } else {
        datastore.addCollection(key, info.id, "id");
    }
    if (deleteIDs && deleteIDs.length > 0 && data) {
        addData(data, info, key, function() {
            deleteData(deleteIDs, info, key, callback);
        });
    } else if (data) {
        addData(data, info, key, callback);
    } else if (deleteIDs && deleteIDs.length > 0) {
        deleteData(deleteIDs, info, key, callback);
    } else {
        callback();
    }
}

function deleteData (deleteIds, info, key, callback) {
    async.forEach(deleteIds, function(id, cb) {
        var newEvent = {obj : {source : key, type: 'delete', data : {}}};
        newEvent.obj.data[info.mongoId] = id;
        newEvent.fromService = "synclet/" + info.id;
        exports.eventEmitter.emit(key + "/" + info.provider, newEvent);
        datastore.removeObject(info.id + "_" + key, id, {timeStampe: Date.now()}, cb);
    }, callback);
}

function addData (data, info, key, callback) {
    async.forEach(data, function(object, cb) {
        var newEvent = {obj : {source : key, type: object.type, data: object.obj}};
        newEvent.fromService = "synclet/" + info.id;
        if (object.type === 'delete') {
            datastore.removeObject(info.id + '_' + key, object.obj[info.mongoId], {timeStamp: object.timestamp}, cb);
            exports.eventEmitter.emit(key + "/" + info.provider, newEvent);
        } else {
            datastore.addObject(info.id + "_" + key, object.obj, {timeStamp: object.timestamp}, function(err, type) {
                if (type === 'same') return cb();
                newEvent.obj.type = type;
                exports.eventEmitter.emit(key + "/" + info.provider, newEvent);
                cb();
            });
        }
    }, callback);
}
/**
* Map a meta data file JSON with a few more fields and make it available
*/
function mapMetaData(file) {
    var metaData = JSON.parse(fs.readFileSync(file, 'utf-8'));
    metaData.srcdir = path.dirname(file);
    synclets.available.push(metaData);
    return metaData;
}
