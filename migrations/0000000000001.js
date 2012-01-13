/*****************************
* Migrates from an "original" locker state to the version of the locker that 
* uses the registry for most pacakges
*/
var fs = require("fs");
var path = require("path");
var util = require("util");
var system = require("child_process").exec;
var spawn = require("child_process").spawn;
var async = require("async");
var logger = require("logger");
var lmongo = require("lmongo");

var locker_config;

module.exports.preServices = function(config, cb) {
    locker_config = config;
    logger.info("Migrating to imthemap and registry experience");
    fixNumberDirs(function(ret) {
        if (!ret) {
            return cb(false);
        }
        me2me(cb);
    });
}

function fixNumberDirs(migrationCB) {
    // Scan the Me directory for all of the *-# directories then attempt to determine the valid one
    var re = /^(.*-\d+)$/;
    var meDir = path.join(locker_config.lockerDir, locker_config.me);
    logger.info("Checking " + meDir + " for bad directories");
    fs.readdir(meDir, function(err, dirs) {
        if (err) {
            logger.error(err);
            migrationCB(false);
        }
        dirs = dirs.filter(function(dir) {
            if (fs.statSync(path.join(meDir, dir)).isDirectory() && re.test(dir)) {
                return true;
            }
            return false;
        });
        // Clean dir!
        if (dirs.length == 0) {
            return migrationCB(true);
        }
        // We start at the beginning and rip out a common set of names, as well as add the basename
        async.whilst(function() { 
            return dirs.length > 0; 
        }, function(whilstCB) {
            var curDirs = [dirs.pop()];
            var baseName = curDirs[0].substring(0, curDirs[0].lastIndexOf("-"));
            // Get all the dirs named like this one
            dirs = dirs.filter(function(dir) {
                if (dir.substring(0, baseName.length) == baseName) {
                    curDirs.push(dir);
                    return false;
                }
                return true;
            });
            curDirs.push(baseName);
            logger.info("Checking " + util.inspect(curDirs));

            // First we need to see if it's a connector or a static app
            var meJsonPath = path.join(meDir, curDirs[0], "me.json");
            try {
                var me = JSON.parse(fs.readFileSync(meJsonPath));
            } catch(E) {
                // Invalid, bail hard because it's in an unknown state
                return migrationCB(false);
            }
            if (me.static && (me.static === true || me.static === "true")) {
                // These are handled too differently in the new experience, reinstall
                return deleteStatics(curDirs, whilstCB);
            }
            else if (me.is && me.is != "connector") {
                // These have valid me.json files but are not connectors, we shouldn't touch them
                logger.warn("Migration skipping unknown directories: " + util.inspect(curDirs));
                return whilstCB();
            }

            // First we try and filter the list to see if only one of these has auth in it
            logger.info("Checking directories for a single valid auth...");
            var hasAuthDirs = curDirs.filter(function(curDir) {
                var meJsonPath = path.join(meDir, curDir, "me.json");
                try {
                    if (path.existsSync(meJsonPath) && JSON.parse(fs.readFileSync(meJsonPath)).auth) {
                        return true;
                    }
                } catch(E) {}
                return false;
            });
            // We found only 1 with auth info!
            if (hasAuthDirs.length == 1) {
                selectConnectorDir(baseName, hasAuthDirs[0], curDirs, function() {
                    return migrationCB(true);
                });
            }
            logger.info("No single valid auth found.");

            // We now sort based on data size in the directory using du on the shell
            // This actually proves the best method by testing on real cases
            logger.info("Finding directory with the most data");
            var dirSizes = [];
            async.map(curDirs, function(dir, mapCB) {
                var cmd = "du -sk " + path.join(meDir, dir) + " | cut -f 1"
                logger.silly(cmd);
                system(cmd, function(err, stdout, stderr) {
                    logger.silly("Dir: " + dir + " Size: " + Number(stdout));
                    mapCB(null, {dir:dir, size:Number(stdout)});
                });
            }, function(err, sizeInfo) {
                sizeInfo.sort(function(lh, rh) {
                    return rh.size - lh.size;
                });
                selectConnectorDir(baseName, sizeInfo[0].dir, curDirs, whilstCB);
            });
        }, function(err) {
            if (err) {
                migrationCB(false);
            }
            migrationCB(true);
        });

    });
}

function selectConnectorDir(basename, validDir, allDirs, cbDone) {
    // Move all others to .archive
    logger.info("Select " + validDir + " for " + basename + " from " + util.inspect(allDirs));
    allDirs.splice(allDirs.indexOf(validDir), 1);
    var meDir = path.join(locker_config.lockerDir, locker_config.me);
    var atticDir = path.join(meDir, ".attic");
    if (!path.existsSync(atticDir)) {
        logger.info("Making an attic directory at: " + atticDir);
        fs.mkdirSync(atticDir, 0755);
    }
    lmongo.connect(function() {
        async.forEach(allDirs, function(dir, eachCB) {
            var svcDir = path.join(meDir, dir);
            var meData = jsonFileSync(path.join(svcDir, "me.json")) || {synclets:[]};
            if (!meData.synclets) meData.synclets = [];
            async.forEach(meData.synclets, function(synclet, syncletEachCB) {
                lmongo.client.dropCollection("asynclets_" + dir + "_" + synclet.name, function() {
                    syncletEachCB();
                });
            }, function() {
                system("mv " + path.join(meDir, dir) + " " + atticDir, function(err, stdout, stderr) {
                    eachCB();
                });
            });
        }, function(err) {
            // If it's already valid, we're done cleaning up
            if (validDir == basename) return;
            // Otherwise we move the validDir to basename Now
            var svcDir = path.join(meDir, validDir);
            var meData = jsonFileSync(path.join(svcDir, "me.json")) || {synclets:[]};
            async.forEach(meData.synclets, function(synclet, syncletEachCB) {
                lmongo.client.renameCollection("asynclets_" + validDir + "_" + synclet.name, 
                                               "asynclets_" + basename + "_" + synclet.name, function() {
                    syncletEachCB();
                });
            }, function() {
                system("mv " + path.join(meDir, validDir) + " " + path.join(meDir, basename), function(err, stdout, stderr) {
                    cbDone();
                });
            });
        });
    });
}

function deleteStatics(dirs, deleteCB) {
    async.forEach(allDirs, function(dir, eachCB) {
        var svcDir = path.join(meDir, dir);
        system("rm -rf " + svcDir, function(error, stdout, stderr) {
            eachCB();
        });
    }, function() {
        deleteCB();
    });
}

function me2me(cb) {
    logger.info("***************************************** me2me");
    var child = spawn("node", [path.join(locker_config.lockerDir, "Ops", "me2me.js"), locker_config.lockerDir], {cwd:path.join(locker_config.lockerDir, locker_config.me)});
    child.stdout.on("data", logger.info);
    child.stderr.on("data", logger.error);
    child.on("exit", function(code) {
        cb(code == 0);
    });
}

function jsonFileSync(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath));
    } catch(E) {
        return undefined;
    }
}
