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
//var crypto = require('crypto');
var lconsole = require("lconsole");
var lscheduler = require("lscheduler");
var serviceManager = require("lservicemanager");
var dashboard = require(__dirname + "/Ops/dashboard.js");
var webservice = require(__dirname + "/Ops/webservice.js");

var lockerHost = process.argv[2]||"localhost";
if(lockerHost != "localhost" && lockerHost != "127.0.0.1") {
    console.warn('if I\'m running on a public IP I needs to have password protection,' + // uniquely self (de?)referential? lolz!
                'which if so inclined can be hacked into lockerd.js and added since it\'s apparently still not implemented :)\n\n');
}
var lockerPort = process.argv[3]||8042;
var lockerBase = "http://"+lockerHost+":"+lockerPort+"/";
var lockerDir = process.cwd();
var shuttingDown_ = false;

// load up private key or create if none, just KISS for now
var idKey,idKeyPub;
function loadKeys()
{
    idKey = fs.readFileSync('Me/key','utf-8');
    idKeyPub = fs.readFileSync('Me/key.pub','utf-8');
    console.log("id keys loaded");
}
path.exists('Me/key',function(exists){
    if(exists)
    {
        loadKeys();
    }else{
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

// look for available things
serviceManager.scanDirectory("Connectors");
serviceManager.scanDirectory("Collections");
serviceManager.scanDirectory("Apps");

// look for existing things
serviceManager.findInstalled();

lscheduler.masterScheduler.loadAndStart();

webservice.startService(lockerPort);

var lockerPortNext = "1"+lockerPort;
dashboard.start(lockerPortNext);
lockerPortNext++;

console.log('locker is running, use your browser and visit ' + lockerBase);

process.on("SIGINT", function() {
    process.stdout.write("\n");
    shuttingDown_ = true;
    serviceManager.shutdown(function() {
        console.log("Shutdown complete.");
        process.exit(0);
    });
});

