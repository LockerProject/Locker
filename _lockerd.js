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

require.paths.push(__dirname + "/Common/node");
var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
var request = require('request');
var async = require('async');
var util = require('util');
var lutil = require('lutil');
var carrier = require('carrier');
require('graceful-fs');


// This lconfig stuff has to come before any other locker modules are loaded!!
var lconfig = require('lconfig');
lconfig.load((process.argv[2] == '--config'? process.argv[3] : 'Config/config.json'));

if(!path.existsSync(path.join(lconfig.lockerDir, 'Config', 'apikeys.json'))) {
    console.error('You must have an apikeys.json file in the Config directory. See the Config/apikeys.json.example file');
    process.exit(1);
}

fs.writeFileSync(__dirname + '/Logs/locker.pid', "" + process.pid);

var logger = require("logger");
logger.info('proccess id:' + process.pid);
var lscheduler = require("lscheduler");
var syncManager = require('lsyncmanager');
var serviceManager = require("lservicemanager");
var pushManager = require(__dirname + "/Common/node/lpushmanager");
var mongodb = require('mongodb');
var lcrypto = require("lcrypto");
var registry = require(__dirname + "/Ops/registry.js");
var lmongo = require('lmongo');

if(process.argv.indexOf("offline") >= 0) syncManager.setExecuteable(false);

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
    mongoProcess = spawn('mongod', ['--nohttpinterface',
                                    '--dbpath', lconfig.lockerDir + '/' + lconfig.me + '/' + lconfig.mongo.dataDir,
                                    '--port', lconfig.mongo.port]);

    var mongoStdout = carrier.carry(mongoProcess.stdout);
    mongoStdout.on('line', function (line) {
        logger.info('[mongo] ' + line);
        if(line.match(/ waiting for connections on port/g)) {
            lmongo.connect(checkKeys);
        }
    });
    var mongoStderr = carrier.carry(mongoProcess.stderr);
    mongoStderr.on('line', function (line) {
        logger.error('[mongo] ' + line);
    });

    var mongodExit = function(errorCode) {
        if(shuttingDown_) return;
        if(errorCode !== 0) {
            var db = new mongodb.Db('locker', new mongodb.Server(lconfig.mongo.host, lconfig.mongo.port, {}), {});
            db.open(function(error, client) {
                if(error) {
                    logger.error('Could not connect to mongo: '+errorCode);
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
            runMigrations("preServices", finishStartup);
        });
    });
}

function finishStartup() {
    // get current git revision if git is available
    var gitHead = spawn('git', ['rev-parse', '--verify', 'HEAD']);
    gitHead.stdout.on('data', function(data) {
        fs.writeFileSync(path.join(lconfig.lockerDir, lconfig.me, 'gitrev.json'), JSON.stringify(data.toString()));
    });

    pushManager.init();
    var webservice = require(__dirname + "/Ops/webservice.js");
    // start web server (so we can all start talking)
    webservice.startService(lconfig.lockerPort, function(locker){
        // ordering sensitive, as synclet manager is inert during init, servicemanager's init will call into syncletmanager
        syncManager.init(serviceManager, function(){
            registry.init(serviceManager, syncManager, lconfig, lcrypto, function(){
                registry.app(locker); // add it's endpoints
                serviceManager.init(syncManager, registry, function() {runMigrations("postServices", postStartup);}); // this may trigger synclets to start!
            });
        });
    });
    var lockerPortNext = "1"+lconfig.lockerPort;
    lockerPortNext++;
}

function runMigrations(phase, migrationCB) {
    var migrations = [];
    var metaData = {version: 0};
    try {
        migrations = fs.readdirSync(path.join(lconfig.lockerDir, "/migrations"));
        metaData = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir, lconfig.me, "state.json")));
    } catch (E) {}

    if (migrations.length > 0) migrations = migrations.sort(); // do in order, so versions are saved properly
    // TODO do these using async serially and pass callbacks!
    async.forEach(migrations, function(migration, cb) {
        if (Number(migration.substring(0, 13)) <= metaData.version) {
            return cb();
        }

        try {
            logger.info("running global migration : " + migration);
            migrate = require(path.join(lconfig.lockerDir, "migrations", migration))[phase];
            migrate(lconfig, function(ret) {
                if (!ret) {
                    logger.error("failed to run global migration!");
                    return shutdown(1);
                }
                metaData.version = Number(migration.substring(0, 13));
                lutil.atomicWriteFileSync(path.join(lconfig.lockerDir, lconfig.me, "state.json"), JSON.stringify(metaData, null, 4));
                cb();

                /*
                // XXX: These are synchronous only right now, until we can find a less destructive way to do post startup
                // if they returned a string, it's a post-startup callback!
                if (typeof ret == 'string')
                {
                    serviceMap.migrations.push(lconfig.lockerBase+"/Me/"+metaData.id+"/"+ret);
                }
                */
            }); 
        } catch (E) {
            // TODO: do we need to exit here?!?
            logger.error("error running global migration : " + migration + " ---- " + E);
            shutdown(1);
        }
    }, function() {
        migrationCB();
    });
}

// scheduling and misc things
function postStartup() {
    lscheduler.masterScheduler.loadAndStart();
    logger.info('locker is up and running at ' + lconfig.lockerBase);
    exports.alive = true;
}

function shutdown(returnCode) {
    shuttingDown_ = true;
    process.stdout.write("\n");
    logger.info("Shutting down...");
    serviceManager.shutdown(function() {
        mongoProcess.kill();
        logger.info("Shutdown complete.", {}, function (err, level, msg, meta) {
            process.exit(returnCode);
        });
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
