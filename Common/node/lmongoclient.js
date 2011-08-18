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
    mongo.collections = {};
    mongo.db = new mongodb.Db('locker', new mongodb.Server(host, port, {}), {});
    function connectToDB(callback, isRetry) {
        mongo.db.open(function(error, client) {
            // in case the mongod process was a bit slow to start up
            if(error && !isRetry) { 
                setTimeout(function() {
                    connectToDB(callback, true);
                }, 2000);
            } else if (error) 
                throw error;
            mongo.dbClient = client;
            callback();
        });
    }
    
    mongo.connect = function(callback) {
        connectToDB(function() {
            for(var i in mongo.collectionNames)
                mongo.addCollection(mongo.collectionNames[i]);
            callback(mongo);
        })
    }
    
    mongo.addCollection = function(name) {
        mongo.collections[name] = new mongodb.Collection(mongo.dbClient, 'a' + mongo.serviceID + '_' + name);
    }
    
    return mongo;
}