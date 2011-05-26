/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var mongodb = require('mongodb');

module.exports = function(host, port, localServiceId, theCollectionNames) {
    var mongo = {};

    mongo.serviceID = localServiceId;
    mongo.collectionNames = theCollectionNames;
    mongo.db = new mongodb.Db('locker', new mongodb.Server(host, port, {}), {});
    function connectToDB(callback, isRetry) {
        mongo.db.open(function(error, client) {
            // in case the mongod process was a bit slow to start up
            if(error && !isRetry) { 
                setTimeout(function() {
                    _connectToDB(callback, true);
                }, 2000);
            } else if (error) 
                throw error;
            mongo.dbClient = client;
            callback();
        });
    }
    
    mongo.connect = function(callback) {
        connectToDB(function() {
            var collections = {};
            for(var i in mongo.collectionNames)
                collections[mongo.collectionNames[i]] = new mongodb.Collection(mongo.dbClient, 'a' + mongo.serviceID + '_' + mongo.collectionNames[i]);
            callback(collections);
        })
    }
    
    return mongo;
}