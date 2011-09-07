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
var conf = {};
conf._exit = false;
var npm = require('npm');
//npm.load(conf, function(er) {
  //npm.commands.install([], function(err, data) {
    require.paths.push(__dirname + "/Common/node");
    var spawn = require('child_process').spawn;
    var fs = require('fs');
    var path = require('path');
    var request = require('request');
    var async = require('async');
    var util = require('util');

    // This lconfig stuff has to come before and other locker modules are loaded!!
    var lconfig = require('lconfig');
    lconfig.load((process.argv[2] == '--config'? process.argv[3] : 'Config/config.json'));

    var logger = require("logger");
    var lconsole = require("lconsole");
    var lscheduler = require("lscheduler");
    var syncManager = require('lsyncmanager');
    var serviceManager = require("lservicemanager");
    var mongodb = require('mongodb');
    var webservice = require(__dirname + "/Ops/webservice.js");
    var lcrypto = require("lcrypto");
    var thservice = require(__dirname + "/Ops/thservice.js");


    if(lconfig.lockerHost != "localhost" && lconfig.lockerHost != "127.0.0.1") {
        console.warn('if I\'m running on a public IP I needs to have password protection,' + // uniquely self (de?)referential? lolz!
                    'which if so inclined can be hacked into lockerd.js and added since' +
                    ' it\'s apparently still not implemented :)\n\n');
    }
    var shuttingDown_ = false;

    var mongoProcess;
    path.exists(lconfig.me + '/' + lconfig.mongo.dataDir, function(exists) {
        if(!exists) {
            try {
                //ensure there is a Me dir
                fs.mkdirSync(lconfig.me, 0755);
            } catch(err) {
                if(err.code !== 'EEXIST')
                    console.error('err', err);
            }
            fs.mkdirSync(lconfig.me + '/' + lconfig.mongo.dataDir, 0755);
        }
        mongoProcess = spawn('mongod', ['--dbpath', lconfig.lockerDir + '/' + lconfig.me + '/' + lconfig.mongo.dataDir,
                                        '--port', lconfig.mongo.port]);
        mongoProcess.stderr.on('data', function(data) {
            console.error('mongod err: ' + data);
        });

        var mongoOutput = "";
        var mongodExit = function(errorCode) {
            if(shuttingDown_) return;
            if(errorCode !== 0) {
                var db = new mongodb.Db('locker', new mongodb.Server('127.0.0.1', lconfig.mongo.port, {}), {});
                db.open(function(error, client) {
                    if(error) {
                        console.error('mongod did not start successfully and was not already running ('+errorCode+'), here was the stdout: '+mongoOutput);
                        shutdown(1);
                    } else {
                        console.error('found a previously running mongodb running on port '+lconfig.mongo.port+' so we will use that');
                        db.close();
                        checkKeys();
                    }
                });
            }
        };
        mongoProcess.on('exit', mongodExit);

        // watch for mongo startup
        var callback = function(data) {
            mongoOutput += data;
            if(mongoOutput.match(/ waiting for connections on port/g)) {
                mongoProcess.stdout.removeListener('data', callback);
                checkKeys();
            }
        };
        mongoProcess.stdout.on('data', callback);
    });


    function checkKeys() {
        lcrypto.generateSymKey(function(hasKey) {
            if (!hasKey) {
                shutdown(1);
                return;
            }
            lcrypto.generatePKKeys(function(hasKeys) {
                if (!hasKeys) {
                    shutdown(1);
                    return;
                }
                finishStartup();
            });
        });
    }

    function finishStartup() {
        // get current git revision if git is available
        var gitHead = spawn('git', ['rev-parse', '--verify', 'HEAD']);
        gitHead.stdout.on('data', function(data) {
            fs.writeFileSync(path.join(lconfig.lockerDir, lconfig.me, 'gitrev.json'), JSON.stringify(data.toString()));
        });

        // look for available things
        lconfig.scannedDirs.forEach(function(dirToScan) {
            console.log(dirToScan);
            var installable = true;
            if (dirToScan === "Collections") installable = false;
            serviceManager.scanDirectory(dirToScan, installable);
        });

        syncManager.scanDirectory("Connectors");

        // look for existing things
        serviceManager.findInstalled();

        // start web server (so we can all start talking)
        webservice.startService(lconfig.lockerPort);
        var lockerPortNext = "1"+lconfig.lockerPort;
        lockerPortNext++;

        // if there's any migrations, load synclets and do them but don't let synclets run till done
        if(serviceManager.serviceMap().migrations.length > 0)
        {
            syncManager.synclets().executable = false;
            syncManager.findInstalled();
            async.forEachSeries(serviceManager.serviceMap().migrations,function(call,cb){
                console.log('running migration followup for '+call);
                request.get({uri:call},function(err,res,body){
                    if(err || !res || res.statusCode != 200)
                    {
                        console.error("failed to run migration, should be bailing hard! "+util.inspect(err)+":"+util.inspect(res)+" trying to hit " + call);
                    }else{
                        console.log("migration success: "+JSON.stringify(body));
                    }
                    cb();
                });
            },function(){
                serviceManager.serviceMap().migrations = [];
                postStartup();
            });
        }else{
            syncManager.findInstalled();
            postStartup();
        }

    }

    // scheduling and misc things
    function postStartup() {
        thservice.start();

        lscheduler.masterScheduler.loadAndStart();

        console.log('locker is running, use your browser and visit ' + lconfig.lockerBase);
    }

    function shutdown(returnCode) {
        process.stdout.write("\n");
        shuttingDown_ = true;
        serviceManager.shutdown(function() {
            mongoProcess.kill();
            console.log("Shutdown complete.");
            process.exit(returnCode);
        });
    }

    process.on("SIGINT", function() {
        shutdown(0);
    });

    // Export some things so this can be used by other processes, mainly for the test runner
    exports.shutdown = shutdown;
//  });
//});
