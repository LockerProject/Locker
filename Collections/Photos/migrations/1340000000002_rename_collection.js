var mongodb = require('mongodb')
  , mongo
  , lconfig = require('../../../Common/node/lconfig')
  ;

module.exports = function(dir) {
    var mongo = {};
    mongo.db = new mongodb.Db('locker', new mongodb.Server(lconfig.mongo.host, lconfig.mongo.port, {}), {});
    mongo.db.open(function(error, client) {

        if (error && !isRetry) {
            return false;
        }
        if (error && error != "connection already opened") throw error;
        
        client.collection('aphotos_photos', function(err, photoCollection) {
            photoCollection.rename('aphotos_photo', function(err, collection) {
                if (err) {
                    return false;
                } 
                return true;
            });
        });
    });
    
    return true;
};