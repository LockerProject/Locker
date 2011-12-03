var mongodb = require('mongodb')
  , mongo
  , lconfig = require('../../../Common/node/lconfig')
  ;

module.exports = function(dir) {
    var mongo = {};
    mongo.db = new mongodb.Db('locker', new mongodb.Server(lconfig.mongo.host, lconfig.mongo.port, {}), {});
    mongo.db.open(function(error, client) {

        if (error && !isRetry) {
            console.error(error);
            return false;
        }
        if (error && error != "connection already opened") throw error;

        client.collection('acontacts_contacts', function(err, contactsCollection) {
            contactsCollection.rename('acontacts_contact', function(err, collection) {
                if (err) {
                    console.error(error);
                    return false;
                } 
                return true;
            });
        });
    });

    return true;
};
