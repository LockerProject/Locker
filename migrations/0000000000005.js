/*****************************
* Migrates from an "original" locker state to the version of the locker that 
* uses the registry for most pacakges
*/
var fs = require("fs");
var path = require("path");
var async = require("async");
var logger = require("logger");

var lutil = require("lutil");

module.exports.preServices = function(config, callback) {
    logger.info("Migrating to publish cleanup");
    reMe(config, function(a, b) {
        console.error("DEBUG: a", a);
        console.error("DEBUG: b", b);
        callback(true);
    });
}

function reMe(config, callback) {
    var meDir = path.join(config.lockerDir, config.me);
    logger.info("Checking " + meDir + " for old github app directories");
    fs.readdir(meDir, function(err, dirs) {
        if (err) return callback(err);
        dirs = dirs.filter(function(dir) {
            return fs.statSync(path.join(meDir, dir)).isDirectory() && dir.indexOf('mongodata') === -1;
        });
        async.forEachSeries(dirs, function(dir, cb) {
            cleanMe(path.join(config.me, dir), cb);
        }, callback);
    });
}

// update a me.json file in the dir
function cleanMe(dir, callback) {
    logger.info("Checking " + dir);
    
    readMe(dir, function(err, me) {
        console.error("DEBUG: err", err);
        console.error("DEBUG: me", me);
        // not all dirs in Me have a me.json (node_modules, mongodata, etc)
        if(err || !me) return callback();
        
        // only do this for services from github
        if(!(me.srcdir && me.srcdir.indexOf('Me/github/') === 0)) return callback();
        
        logger.info("Migrating " + dir);
        
        // get the github repo name from the end of the path
        var repo = me.srcdir.substring(10);
        
        // this is logic from the github repos.js synclet to normalize the repo name into a handle
        var handle = repo.replace('/', '-').toLowerCase();
        
        // these all need to be the same
        me.handle = me.id = me.provider = handle;
        writeMeSync(dir, me);
        
        // rename the dir to match the new id
        var ldir = dir.toLowerCase();
        fs.renameSync(dir, ldir);
        
        //done!
        callback();
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