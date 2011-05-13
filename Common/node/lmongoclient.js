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

module.exports = function(host, port) {
    db = new mongodb.Db('locker', new mongodb.Server(host, port, {}), {});
    this.getCollection = getCollection;
    this.connectToDB = connectToDB;
    return this;
}

function connectToDB(callback) {
    _connectToDB(callback);
}

function _connectToDB(callback, isRetry) {
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

function getCollection(serviceID, collectionName) {
    return new mongodb.Collection(dbClient, serviceID + '-' + collectionName);
}