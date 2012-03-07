/*****************************
* Updates the contacts collection since we've added a new field to the dataMap
*/
var request = require("request");
var logger = require("logger");

module.exports.postStartup = function(config, callback) {
   request.get({uri:config.lockerBase + '/Me/contacts/update'}, function(err, resp, body) {
      if ((err || resp.statusCode !== 200) && body !== "already running") {
         if (resp && resp.statusCode !== 200)
            logger.error("couldn't update contacts, response: " + body);

         if (err)
            logger.error(new Error(err).stack);

         return callback(false);
      }

      callback(true);
   });
};
