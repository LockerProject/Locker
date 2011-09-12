/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var mongodb = require('mongodb')
  , mongo
  , lconfig = require('./lconfig')
  ;

module.exports = mongo = {collections : {}, client : undefined};

mongo.connect = function(callback) {
    if (mongo.client) return callback(mongo);
    // these 2 empty objects are settings that can be passed, the first
    // allows you to do things like disable autoreconnect, the second is
    // using things like custom PK factories
    mongo.db = new mongodb.Db('locker', new mongodb.Server(lconfig.mongo.host, lconfig.mongo.port, {}), {});
    var attempts = 5;
    var tryMongo = function(attempts) {
        mongo.db.open(function(error, client) {
            if (error) {
                attempts--;
                if (attempts == 0) {
                    console.error('mongod is doing that thing that we don\'t like much.');
                    console.error(error);
                    process.kill(process.pid, 'SIGINT');
                } else {
                   setTimeout(function() { tryMongo(attempts) }, 2000);
                }
            } else {
                mongo.client = client;
                callback();
            }
        });
    }
    tryMongo(attempts);
};

mongo.init = function(localServiceId, theCollectionNames, callback) {
    mongo.collections[localServiceId] = {};
    mongo.connect(function() {
        for (var i in theCollectionNames) {
            mongo.addCollection(localServiceId, theCollectionNames[i]);
        }
        callback(mongo, mongo.collections[localServiceId]);
    });
};

mongo.addCollection = function(localServiceId, name) {
    mongo.collections[localServiceId][name] = new mongodb.Collection(mongo.client, 'a' + localServiceId + '_' + name);
};
