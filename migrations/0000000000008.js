/*****************************
* Converts mongo synclet data to ijod
*/
var request = require("request");
var logger = require("logger");
var path = require("path");
var lconfig = require("lconfig");
var mongo2ijod = require(path.join(lconfig.lockerDir, "Ops", "mongo2ijod.js"));

module.exports.preServices = function(config, callback) {
  mongo2ijod.run(function(err) {
    if (err) logger.error(err);
    callback(err ? false : true);
  });
};
