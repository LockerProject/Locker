/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var mongodb = require('mongodb');

var db, dbClient;
var serviceID, collectionNames;

module.exports = function(host, port, localServiceId, theCollectionNames) {
    serviceID = localServiceId;
    collectionNames = theCollectionNames;
    db = new mongodb.Db('locker', new mongodb.Server(host, port, {}), {});
    this.connect = connect;
    return this;
}

function connectToDB(callback, isRetry) {
    db.open(function(error, client) {
        // in case the mongod process was a bit slow to start up
        if(error && !isRetry) { 
            setTimeout(function() {
                _connectToDB(callback, true);
            }, 2000);
        } else if (error) 
            throw error;
        dbClient = client;
        callback();
    });
}

function connect(callback) {
    connectToDB(function() {
        var collections = {};
        for(var i in collectionNames)
            collections[collectionNames[i]] = new mongodb.Collection(dbClient, serviceID + '-' + collectionNames[i]);
        callback(collections);
    })
}