/*****************************
* Migrates from an "original" locker state to the version of the locker that
* uses the registry for most pacakges
*/
var fs = require("fs");
var path = require("path");
var async = require("async");
var request = require("request");
var logger = require("logger");

module.exports.postStartup = function(config, callback) {
    fs.stat(path.join(config.lockerDir, config.me, 'github'), function(err, stat) {
        if(!stat.isDirectory()) return callback(true);
        request.get({uri:config.lockerBase + '/Me/github/run?id=repos'}, function(err, resp, body) {
            if(err || resp.statusCode !== 200 && body !== "already running") {
                if (resp.statusCode !== 200) logger.error("couldn't pull GitHub repos, response from connector: " + body);
                if (err) logger.error(new Error(err).stack);
                return callback(false);
            }
            callback(true);
        });
    });
};
