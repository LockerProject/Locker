var fs = require('fs')
  , path = require('path')
  , lconfig = require("lconfig")
  , spawn = require('child_process').spawn
  ;

var synclets = {
    available:[],
    installed:{}
};

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
            if (js.frequency) scheduleRun(js);
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
    if(serviceInfo.handle) {
        try {
            var apiKeys = JSON.parse(fs.readFileSync(lconfig.lockerDir + "/" + lconfig.me + "/apikeys.json", 'ascii'));
            authInfo = apiKeys[serviceInfo.provider];
        } catch (E) { console.dir(E); }
        // the inanity of this try/catch bullshit is drrrrrrnt but async is stupid here and I'm offline to find a better way atm
        var inc = 0;
        try {
            if(fs.statSync(lconfig.lockerDir+"/" + lconfig.me + "/synclets/"+serviceInfo.handle).isDirectory()) {
                inc++;
                while(fs.statSync(lconfig.lockerDir+"/" + lconfig.me + "/synclets/"+serviceInfo.handle+"-"+inc).isDirectory()) {inc++;}
            }
        } catch (E) {
            var suffix = (inc > 0)?"-"+inc:"";
            serviceInfo.id = serviceInfo.handle+suffix;
        }
    } else {
        var hash = crypto.createHash('md5');
        hash.update(Math.random()+'');
        serviceInfo.id = hash.digest('hex');
    }
    synclets.installed[serviceInfo.id] = serviceInfo;
    fs.mkdirSync(lconfig.lockerDir + "/" + lconfig.me + "/synclets/"+serviceInfo.id,0755);
    if (authInfo) serviceInfo.auth = authInfo;
    fs.writeFileSync(lconfig.lockerDir + "/" + lconfig.me + "/synclets/"+serviceInfo.id+'/me.json',JSON.stringify(serviceInfo, null, 4));
    if (serviceInfo.frequency) scheduleRun(serviceInfo);
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
    executeSynclet(synclets.installed[serviceId], callback);
};

/**
* Add a timeout to run a synclet
*/
function scheduleRun(info) {
    console.dir(new Date() + parseInt(info.frequency));
    info.nextRun = new Date() + parseInt(info.frequency);
    info.nextRunId = setTimeout(function() {
        executeSynclet(info);
    }, parseInt(info.frequency) * 1000);
};

/**
* Executes a synclet
*/
function executeSynclet(info, callback) {
    info.status = "running";
    if (!info.run) {
        // this is how we'll handle the common client code version
        return;
    }

    run = info.run.split(" "); // node foo.js

    var env = process.env;
    env["NODE_PATH"] = lconfig.lockerDir+'/Common/node/';
    var dataResponse = '';
    app = spawn(run.shift(), run, {cwd: info.srcdir, env:process.env});
    
    app.stderr.on('data', function (data) {
        var mod = console.outputModule;
        console.outputModule = info.title;
        console.error(data);
        console.outputModule = mod;
    });

    app.stdout.on('data',function (data) {
        dataResponse += data;
    });
    
    app.on('exit', function (code,signal) {
        processResponse(info, dataResponse, callback);
        scheduleRun(info);
    });
    if (!info.config) info.config = {};
    app.stdin.write(JSON.stringify(info.config)+"\n"); // Send them the process information
};

function processResponse(info, data, callback) {
    info.status = 'processing data';
    var response;
    try {
        response = JSON.parse(data);
    } catch (E) {
        info.status = 'failed : ' + E;
        return callback(E);
    }
    info.config = response.config;
    info.status = 'waiting';
    
    if (callback) callback(undefined, 'finished');
};

/**
* Map a meta data file JSON with a few more fields and make it available
*/
function mapMetaData(file) {
    var metaData = JSON.parse(fs.readFileSync(file, 'utf-8'));
    metaData.srcdir = path.dirname(file);
    synclets.available.push(metaData);
    return metaData;
}
