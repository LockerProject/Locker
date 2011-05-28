/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/* random notes:
on startup scan all folders
    Apps Collections Connectors - generate lists of "available"
    Me/* - generate lists of "existing"

when asked, run any existing and return localhost:port
if first time
    check dependencies
    create Me/ dir
    create me.json settings
    pick a port
*/

require.paths.push(__dirname + "/Common/node");
var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');

// This lconfig stuff has to come before and other locker modules are loaded!!
var lconfig = require('lconfig');
lconfig.load((process.argv[2] == '--config'? process.argv[3] : 'config.json'));


//var crypto = require('crypto');
var lconsole = require("lconsole");
var lscheduler = require("lscheduler");
var serviceManager = require("lservicemanager");
var dashboard = require(__dirname + "/Ops/dashboard.js");
var webservice = require(__dirname + "/Ops/webservice.js");


if(lconfig.lockerHost != "localhost" && lconfig.lockerHost != "127.0.0.1") {
    console.warn('if I\'m running on a public IP I needs to have password protection,' + // uniquely self (de?)referential? lolz!
                'which if so inclined can be hacked into lockerd.js and added since' + 
                ' it\'s apparently still not implemented :)\n\n');
}
var shuttingDown_ = false;

var mongoProcess;
path.exists(lconfig.me + '/' + lconfig.mongo.dataDir, function(exists) {
    if(!exists)
        fs.mkdirSync(lconfig.me + '/' + lconfig.mongo.dataDir, 0755);
    mongoProcess = spawn('mongod', ['--dbpath', lconfig.lockerDir + '/' + lconfig.me + '/' + lconfig.mongo.dataDir, 
                                    '--port', lconfig.mongo.port]);
    mongoProcess.stderr.on('data', function(data) {
        console.error('mongod err: ' + data);
    });
    
    var mongodExit = function(errorCode) {
        if(errorCode !== 0) {
            console.error('mongod did not start successfully.');
            shutdown();
        }
    };
    mongoProcess.on('exit', mongodExit);
    
    // watch for mongo startup
    var mongoOutput = "";
    var callback = function(data) {
        mongoOutput += data;
        if(mongoOutput.match(/ waiting for connections on port/g)) {
            mongoProcess.stdout.removeListener('data', callback);
            checkKeys();
        }
    };
    mongoProcess.stdout.on('data', callback);
});

// load up private key or create if none, just KISS for now
var idKey,idKeyPub;
function loadKeys() {
    idKey = fs.readFileSync('Me/key','utf-8');
    idKeyPub = fs.readFileSync('Me/key.pub','utf-8');
    console.log("id keys loaded");
    finishStartup();
}

function checkKeys() {
    path.exists('Me/key',function(exists){
        if(exists) {
            loadKeys();
        } else {
            openssl = spawn('openssl', ['genrsa', '-out', 'key', '1024'], {cwd: 'Me'});
            console.log('generating id private key');
    //        openssl.stdout.on('data',function (data){console.log(data);});
    //        openssl.stderr.on('data',function (data){console.log('Error:'+data);});
            openssl.on('exit', function (code) {
                console.log('generating id public key');
                openssl = spawn('openssl', ['rsa', '-pubout', '-in', 'key', '-out', 'key.pub'], {cwd: 'Me'});
                openssl.on('exit', function (code) {
                    loadKeys();
                });
            });
        }
    });
}

function finishStartup() {
    // look for available things
    lconfig.scannedDirs.forEach(serviceManager.scanDirectory);

    // look for existing things
    serviceManager.findInstalled();

    lscheduler.masterScheduler.loadAndStart();

    webservice.startService(lconfig.lockerPort);

    var lockerPortNext = "1"+lconfig.lockerPort;
    dashboard.start(lockerPortNext);
    lockerPortNext++;

    console.log('locker is running, use your browser and visit ' + lconfig.lockerBase);
}

function shutdown() {
    process.stdout.write("\n");
    shuttingDown_ = true;
    dashboard.instance.kill(dashboard.pid, "SIGINT");
    serviceManager.shutdown(function() {
        mongoProcess.kill();
        console.log("Shutdown complete.");
        process.exit(0);
    });
}

process.on("SIGINT", function() {
    shutdown();
});

// Export some things so this can be used by other processes, mainly for the test runner
exports.shutdown = shutdown;
