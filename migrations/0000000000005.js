/*****************************
* Migrates from an "original" locker state to the version of the locker that 
* uses the registry for most pacakges
*/
var fs = require("fs");
var path = require("path");

var async = require("async");
var request = require("request");
var wrench = require("wrench");

var logger = require("logger");
var lutil = require("lutil");

module.exports.preServices = function(config, callback) {
    logger.info("Migrating to publish cleanup");
    var meDir = path.join(config.lockerDir, config.me);
    reMe(meDir, function(err) {
        if(err) return callback(false);
        clearCached(meDir, function(err) {
            if(err) return callback(false);
            callback(true);
        })
    });
}

function reMe(meDir, callback) {
    logger.info("Checking " + meDir + " for old github app directories");
    
    fs.readdir(meDir, function(err, dirs) {
        if (err) return callback(err);
        dirs = dirs.filter(function(dir) {
            return fs.statSync(path.join(meDir, dir)).isDirectory() && dir.indexOf('mongodata') === -1;
        });
        async.forEachSeries(dirs, function(dir, cb) {
            cleanMe(path.join(meDir, dir), cb);
        }, callback);
    });
}

function cleanTrees(ghd, callback) {
    fs.readdir(ghd, function(err, files) {
        if(err || !files) return callback();
        files.filter(function(file) {
            return !fs.statSync(path.join(ghd, file)).isDirectory() && file.indexOf('tree.json') === file.length - 9;
        }).forEach(function(file) {
            fs.unlinkSync(path.join(ghd, file));
        });
        callback();
    });
}

// update a me.json file in the dir
function cleanMe(dir, callback) {
    logger.info("Checking " + dir);
    readMe(dir, function(err, me) {
        // not all dirs in Me have a me.json (node_modules, mongodata, etc)
        if(err || !me) return callback();

        // only do this for services from github
        if(!(me.srcdir && me.srcdir.indexOf('Me/github/') === 0)) return callback();

        logger.info("Removing me dir github repo app in " + dir);
        wrench.rmdirRecursive(dir, callback);
    });
}

// clear out the "cache" field from the github me.json config. Will force repos to pull fresh.
function clearCached(meDir, callback) {
    logger.info('looking for github data...');
    var ghDir = path.join(meDir, 'github');
    cleanTrees(ghDir, function() {
        readMe(ghDir, function(err, me) {
            if(err) return callback(err);
            logger.info('github data found, clearing cache...');
            delete me.config.cached;
            writeMeSync(ghDir, me);
            logger.info('cleared github config cache...');
            callback();
        });
    });
}

// read in the me.json file and (try to) parse it
function readMe(dir, callback) {
    fs.readFile(dir + "/me.json", function(err, data) {
        try {
            var me = JSON.parse(data);
            return callback(null, me);
        } catch(err) {
            return callback(err);
        }
    });
}

// write out the me.json file
function writeMeSync(dir, me) {
    lutil.atomicWriteFileSync(dir + "/me.json", JSON.stringify(me, null, 4));
}