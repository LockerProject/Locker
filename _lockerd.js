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
exports.alive = false;
// var npm = require('npm');
//npm.load(conf, function(er) {
  //npm.commands.install([], function(err, data) {
    require.paths.push(__dirname + "/Common/node");
    var spawn = require('child_process').spawn;
    var fs = require('fs');
    var path = require('path');
    var request = require('request');
    var async = require('async');
    var util = require('util');
    var lutil = require('lutil');
    require('graceful-fs');


    // This lconfig stuff has to come before and other locker modules are loaded!!
    var lconfig = require('lconfig');
    lconfig.load((process.argv[2] == '--config'? process.argv[3] : 'Config/config.json'));

    fs.writeFileSync(__dirname + '/Logs/locker.pid', "" + process.pid);

    var logger = require("logger");
    logger.info('proccess id:' + process.pid);
    // var lconsole = require("lconsole");
    var lscheduler = require("lscheduler");
    var syncManager = require('lsyncmanager');
    var serviceManager = require("lservicemanager");
    var pushManager = require(__dirname + "/Common/node/lpushmanager");
    var mongodb = require('mongodb');
    var webservice = require(__dirname + "/Ops/webservice.js");
    var lcrypto = require("lcrypto");
    var thservice = require(__dirname + "/Ops/thservice.js");
    var lmongo = require('lmongo');

    if(process.argv.indexOf("offline") >= 0) syncManager.synclets().executeable = false;

    if(lconfig.lockerHost != "localhost" && lconfig.lockerHost != "127.0.0.1") {
        logger.warn('if I\'m running on a public IP I needs to have password protection,' + // uniquely self (de?)referential? lolz!
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
                    logger.error('err: ' + util.inspect(err));
            }
            fs.mkdirSync(lconfig.me + '/' + lconfig.mongo.dataDir, 0755);
        }
        mongoProcess = spawn('mongod', ['--dbpath', lconfig.lockerDir + '/' + lconfig.me + '/' + lconfig.mongo.dataDir,
                                        '--port', lconfig.mongo.port]);
        mongoProcess.stderr.on('data', function(data) {
            logger.error('mongod err: ' + data);
        });

        var mongoOutput = "";
        var mongodExit = function(errorCode) {
            if(shuttingDown_) return;
            if(errorCode !== 0) {
                var db = new mongodb.Db('locker', new mongodb.Server(lconfig.mongo.host, lconfig.mongo.port, {}), {});
                db.open(function(error, client) {
                    if(error) {
                        logger.error('mongod did not start successfully and was not already running ('+errorCode+'), here was the stdout: '+mongoOutput);
                        shutdown(1);
                    } else {
                        logger.error('found a previously running mongodb running on port '+lconfig.mongo.port+' so we will use that');
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
                lmongo.connect(checkKeys);
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
            logger.verbose(dirToScan);
            var installable = true;
            if (dirToScan === "Collections") installable = false;
            try {
                serviceManager.scanDirectory(dirToScan, installable);
            } catch (E) {}
        });

        syncManager.scanDirectory("Connectors");

        // look for existing things
        serviceManager.findInstalled();
        pushManager.init();

        // start web server (so we can all start talking)
        webservice.startService(lconfig.lockerPort, runMigrations);
        var lockerPortNext = "1"+lconfig.lockerPort;
        lockerPortNext++;


    }

    function runMigrations() {
        var migrations = [];
        var metaData = {version: 1};
        try {
            migrations = fs.readdirSync(path.join(lconfig.lockerDir, "/migrations"));
            logger.verbose(migrations);
            metaData = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir, lconfig.me, "state.json")));
            logger.verbose(metaData);
        } catch (E) {}
        if (migrations.length > 0) migrations = migrations.sort(); // do in order, so versions are saved properly
        for (var i = 0; i < migrations.length; i++) {
            if (migrations[i].substring(0, 13) > metaData.version) {
                try {
                    logger.info("running global migration : " + migrations[i]);
                    migrate = require(path.join(lconfig.lockerDir, "migrations", migrations[i]));
                    var ret = migrate(lconfig); // prolly needs to be sync and given a callback someday
                    if (ret) {
                        // load new file in case it changed, then save version back out
                        var curMe = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir, lconfig.me, "state.json"), 'utf8'));
                        metaData.version = migrations[i].substring(0, 13);
                        curMe.version = metaData.version;
                        lutil.atomicWriteFileSync(path.join(lconfig.lockerDir, lconfig.me, "state.json"), JSON.stringify(curMe, null, 4));
                    } else {
                        // this isn't clean but we have to do something drastic!!!
                        logger.error("failed to run global migration!");
                        process.exit(1);
                    }
                    // if they returned a string, it's a post-startup callback!
                    if (typeof ret == 'string')
                    {
                        serviceMap.migrations.push(lconfig.lockerBase+"/Me/"+metaData.id+"/"+ret);
                    }
                } catch (E) {
                    // TODO: do we need to exit here?!?
                    logger.error("error running global migration : " + migrations[i] + " ---- " + E);
                }
            }
        }

        // if there's any migrations, load synclets and do them but don't let synclets run till done
        if(serviceManager.serviceMap().migrations.length > 0)
        {
            syncManager.synclets().executeable = false;
            syncManager.findInstalled();
            async.forEachSeries(serviceManager.serviceMap().migrations,function(call,cb){
                logger.info('running migration followup for '+call);
                request.get({uri:call},function(err,res,body){
                    if(err || !res || res.statusCode != 200)
                    {
                        logger.error("failed to run migration, should be bailing hard! "+util.inspect(err)+":"+util.inspect(res)+" trying to hit " + call);
                        // process.exit(1);
                    }else{
                        logger.info("migration success: "+JSON.stringify(body));
                    }
                    cb();
                });
            },function(){
                serviceManager.serviceMap().migrations = [];
                syncManager.synclets().executeable = true;
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

        logger.info('locker is up and running at ' + lconfig.lockerBase);
        exports.alive = true;
    }

    function shutdown(returnCode) {
        process.stdout.write("\n");
        shuttingDown_ = true;
        serviceManager.shutdown(function() {
            mongoProcess.kill();
            logger.info("Shutdown complete.");
            process.exit(returnCode);
        });
    }

    process.on("SIGINT", function() {
        shutdown(0);
    });

    process.on("SIGTERM", function() {
        shutdown(0);
    });

    process.on('uncaughtException', function(err) {
        if (shuttingDown_ === true) { process.exit(1); }
        logger.error(util.inspect(err));
        if(err && err.stack) logger.error(util.inspect(err.stack));
        if (lconfig.airbrakeKey) {
            var airbrake = require('airbrake').createClient(lconfig.airbrakeKey);
            airbrake.notify(err, function(err, url) {
                if(url) logger.error(url);
                shutdown(1);
            });
        }else{
            shutdown(1);
        }
    });

    // Export some things so this can be used by other processes, mainly for the test runner
    exports.shutdown = shutdown;
//  });
//});

