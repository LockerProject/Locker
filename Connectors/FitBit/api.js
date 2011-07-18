/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var dataStore = require('connector/dataStore');

exports.init = function(mongo) {
    dataStore.init('id', mongo);
}

exports.getDevices = function(req, res) {
    dataStore.getAllCurrent('devices', function(err, array) {
        if(err || !array) {
            res.writeHead(500)
            res.end(JSON.stringify(err));
        } else {
            res.writeHead(200, 'application/json');
            res.end(JSON.stringify(array));
        }
    });
}