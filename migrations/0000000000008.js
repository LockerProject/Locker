/*****************************
* Forces refresh of twitter contacts since many got munged with dorkwad jeremie's
*/
var fs = require("fs");
var path = require("path");

var async = require("async");
var request = require("request");
var wrench = require("wrench");

var logger = require("logger");
var lutil = require("lutil");
var lmongo = require("lmongo");


module.exports.preServices = function(config, callback) {
    logger.info("removing twitter synclet contacts");
    lmongo.connect(function() {
        lmongo.client.dropCollection("asynclets_twitter_contact", function(){callback(true)});
    });
}

module.exports.postStartup = function(config, callback) {
    fs.stat(path.join(config.lockerDir, config.me, 'twitter'), function(err, stat) {
        if(!stat || (stat && !stat.isDirectory())) return callback(true);
        request.get({uri:config.lockerBase + '/Me/contacts/update'}, function(err, resp, body) {
            if(err || resp.statusCode !== 200) {
                logger.error("failed to call contacts update "+(err||resp.statusCode));
                callback(false);
            }
            request.get({uri:config.lockerBase + '/Me/twitter/run?id=friends'}, function(err, resp, body) {
                if(err || resp.statusCode !== 200) {
                    logger.error("failed to call twitter run "+(err||resp.statusCode));
                    callback(false);
                }
                callback(true);
            })
        });
    });
};