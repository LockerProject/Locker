var fs = require('fs')
  , path = require('path')
  , lconfig = require("lconfig")
  , spawn = require('child_process').spawn
  , datastore
  , async = require('async')
  , lutil = require('lutil')
  , EventEmitter = require('events').EventEmitter
  , levents = require(__dirname + '/levents')
  ;

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
            var js = JSON.parse(fs.readFileSync(dir+'/me.json', 'utf-8'));
            if (js.synclets) {
                exports.migrate(dir, js);
                console.log("Loaded synclets for "+js.id);
                synclets.installed[js.id] = js;
                synclets.installed[js.id].status = "waiting";
                for (var j = 0; j < js.synclets.length; j++) {
                    js.synclets[j].status = 'waiting';
                    scheduleRun(js, js.synclets[j]);
                }
            }
        } catch (E) {
            console.log("Me/"+dirs[i]+" does not appear to be a synclet (" +E+ ")");
        }
    }
}

exports.scanDirectory = function(dir) {
    datastore = require('./synclet/datastore');
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
    fs.writeFileSync(path.join(lconfig.lockerDir, lconfig.me, serviceInfo.id, 'me.json'),JSON.stringify(serviceInfo, null, 4));
    for (var i = 0; i < serviceInfo.synclets.length; i++) {
        scheduleRun(serviceInfo, serviceInfo.synclets[i]);
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
    async.forEach(synclets.installed[serviceId].synclets, function(synclet, cb) { 
        executeSynclet(synclets.installed[serviceId], synclet, cb); 
    }, callback);
};

/**
* Add a timeout to run a synclet
*/
function scheduleRun(info, synclet) {
    if(info.config && info.config.nextRun) {
        synclet.nextRun = new Date(info.config.nextRun);
    } else {
        synclet.nextRun = new Date(Date.now() + (parseInt(synclet.frequency) * 1000));
    }
    
    function run() {
        executeSynclet(info, synclet);
    }
    
    var timeout = synclet.nextRun - Date.now();
    if(timeout < 0) { // now
        process.nextTick(run)
    } else { // later
        setTimeout(run, timeout);
    }
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
    // we're put on hold from running any for some reason, re-schedule them
    if (!synclets.executeable)
    {
        console.log("Delaying execution of synclet "+synclet.name+" for "+info.id);
        scheduleRun(info, synclet);
        if (callback) {
            callback();
        }
        return;
    }
    console.log("Synclet "+synclet.name+" starting for "+info.id);
    info.status = synclet.status = "running";
    if (!synclet.run) {
        run = ["node", lconfig.lockerDir + "/Common/node/synclet/client.js"];
    } else {
        run = ["node", path.join(lconfig.lockerDir, info.srcdir, synclet.run)];
    }

    var dataResponse = '';

    app = spawn(run.shift(), run, {cwd: path.join(lconfig.lockerDir, info.srcdir)});
    
    app.stderr.on('data', function (data) {
        var mod = console.outputModule;
        console.outputModule = info.title+" "+synclet.name;
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
        console.log("Synclet "+synclet.name+" finished for "+info.id);
        info.status = synclet.status = 'processing data';
        tempInfo = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir, lconfig.me, info.id, 'me.json')));
        var deleteIDs = compareIDs(info.config, response.config);
        processResponse(deleteIDs, info, synclet, response, callback);
        info.config = lutil.extend(true, tempInfo.config, response.config);
        info.auth = lutil.extend(true, tempInfo.auth, response.auth);
        fs.writeFileSync(path.join(lconfig.lockerDir, lconfig.me, info.id, 'me.json'), JSON.stringify(info, null, 4));
        scheduleRun(info, synclet);
    });
    if (!info.config) info.config = {};
    
    info.syncletToRun = synclet;
    info.syncletToRun.workingDirectory = path.join(lconfig.lockerDir, lconfig.me, info.id);
    app.stdin.write(JSON.stringify(info)+"\n"); // Send them the process information
    delete info.syncletToRun;
};

function compareIDs (originalConfig, newConfig) {
    var resp = {};
    if (originalConfig && originalConfig.ids && newConfig && newConfig.ids) {
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
        if (typeof(response.data) === 'string') {
            return callback('bad data from synclet');
        }
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
    // this extra (handy) log breaks the synclet tests somehow??
//    console.log("processing synclet data from "+key+" of length "+data.length);
    var collection = info.id + "_" + key;
    var eventType = key + "/" + info.provider;
    
    if (key.indexOf('/') !== -1) {
        collection = info.id + "_" + key.substring(key.indexOf('/') + 1);
        eventType = key.substring(0, key.indexOf('/')) + "/" + info.provider;
        key = key.substring(key.indexOf('/') + 1);
    }
    
    var mongoId;
    if(typeof info.mongoId === 'string')
        mongoId = info.mongoId
    else if(info.mongoId)
        mongoId = info.mongoId[key + 's'] || 'id';
    else
        mongoId = 'id';
    
    datastore.addCollection(key, info.id, mongoId);
    
    if (deleteIDs && deleteIDs.length > 0 && data) {
        addData(collection, mongoId, data, info, eventType, function(err) {
            if(err) {
                callback(err);
            } else {
                deleteData(collection, mongoId, deleteIDs, info, eventType, callback);
            }
        });
    } else if (data) {    
        addData(collection, mongoId, data, info, eventType, callback);
    } else if (deleteIDs && deleteIDs.length > 0) {
        deleteData(collection, mongoId, deleteIDs, info, eventType, callback);
    } else {
        callback();
    }
}

function deleteData (collection, mongoId, deleteIds, info, eventType, callback) {
    async.forEach(deleteIds, function(id, cb) {
        var newEvent = {obj : {source : eventType, type: 'delete', data : {}}};
        newEvent.obj.data[mongoId] = id;
        newEvent.fromService = "synclet/" + info.id;
        levents.fireEvent(eventType, newEvent.fromService, newEvent.obj.type, newEvent.obj);
        datastore.removeObject(collection, id, {timeStampe: Date.now()}, cb);
    }, callback);
}

function addData (collection, mongoId, data, info, eventType, callback) {
    var errs = [];
    async.forEach(data, function(object, cb) {
        if (object.obj) {
            if(object.obj[mongoId] === null || object.obj[mongoId] === undefined) {
                console.error('rut roh! no value for primary key!');
                errs.push({"message":"no value for primary key", "obj": object.obj});
                cb();
                return;
            }
            var newEvent = {obj : {source : collection, type: object.type, data: object.obj}};
            newEvent.fromService = "synclet/" + info.id;
            if (object.type === 'delete') {
                datastore.removeObject(collection, object.obj[mongoId], {timeStamp: object.timestamp}, cb);
                levents.fireEvent(eventType, newEvent.fromService, newEvent.obj.type, newEvent.obj);
            } else {
                datastore.addObject(collection, object.obj, {timeStamp: object.timestamp}, function(err, type, doc) {
                    if (type === 'same') return cb();
                    newEvent.obj.data = doc;
                    levents.fireEvent(eventType, newEvent.fromService, type, newEvent.obj);
                    cb();
                });
            }
        }
    }, function(err) {
        if (err) {
            errs.push(err);
        }
        if (errs.length > 0) {
            callback(errs);
        } else {
            callback();
        }
    });
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
                    if (migrate(installedDir)) {
                        metaData.version = migrations[i].substring(0, 13);
                    }
                    process.chdir(cwd);
                } catch (E) {
                    console.log("error running migration : " + migrations[i] + " for service " + metaData.title + " ---- " + E);
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
    var metaData = JSON.parse(fs.readFileSync(file, 'utf-8'));
    metaData.srcdir = path.dirname(file);
    synclets.available.push(metaData);
    return metaData;
}

function addUrls() {
    var apiKeys;
    var host;
    if (lconfig.externalSecure) {
        host = "https://";
    } else {
        host = "http://";
    }
    host += lconfig.externalHost + ":" + lconfig.externalPort + "/";
    if (path.existsSync(path.join(lconfig.lockerDir, "Config", "apikeys.json"))) {
        try {
            apiKeys = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir, "Config", "apikeys.json"), 'ascii'));
        } catch(e) {
            return console.log('Error reading apikeys.json file - ' + e);
        }
        for (var i = 0; i < synclets.available.length; i++) {
            synclet = synclets.available[i];
            if (synclet.provider === 'facebook') {
                if (apiKeys.facebook)
                    synclet.authurl = "https://graph.facebook.com/oauth/authorize?client_id=" + apiKeys.facebook.appKey + 
                                        '&response_type=code&redirect_uri=' + host + "auth/facebook/auth" + 
                                        "&scope=email,offline_access,read_stream,user_photos,friends_photos,user_photo_video_tags";
            } else if (synclet.provider === 'twitter') {
                if (apiKeys.twitter) synclet.authurl = host + "auth/twitter/auth";
            } else if (synclet.provider === 'flickr') {
                if (apiKeys.twitter) synclet.authurl = host + "auth/flickr/auth";
            } else if (synclet.provider === 'foursquare') {
                if (apiKeys.foursquare)
                    synclet.authurl = "https://foursquare.com/oauth2/authenticate?client_id=" + apiKeys.foursquare.appKey + 
                                                            "&response_type=code&redirect_uri=" + host + "auth/foursquare/auth";
            } else if (synclet.provider === 'gcontacts') {
                if (apiKeys.gcontacts)
                    synclet.authurl = "https://accounts.google.com/o/oauth2/auth?client_id=" + apiKeys.gcontacts.appKey + 
                                                    "&redirect_uri=" + host + "auth/gcontacts/auth" + 
                                                    "&scope=https://www.google.com/m8/feeds/&response_type=code";
            } else if (synclet.provider === 'github') {
                if (apiKeys.github)
                    synclet.authurl = "https://github.com/login/oauth/authorize?client_id=" + apiKeys.github.appKey + 
                                                    '&response_type=code&redirect_uri=' + host + 'auth/github/auth';
            }
        }
    }
}
