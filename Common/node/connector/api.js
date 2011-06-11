/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    lfs = require("../lfs.js"),
    dataStore = require('./dataStore.js'),
    validTypes = [];


module.exports = function(app, id, mongo) {

for (var i in mongo.collections) {
    validTypes.push(i);
}

dataStore.init(id, mongo);

// In adherence with the contact/* provider API
// Returns a list of the current set of friends or followers
app.get('/getCurrent/:type', function(req, res) {
    var type = req.params.type;
    if (validTypes.indexOf(type) === -1) {
        res.writeHead(404, {'content-type' : 'application/json'});
        res.end('{error: type not found}');
    } else {
        dataStore.getAllCurrent(req.params.type, function(err, objects) {
            if (err) {
                res.writeHead(500, {'content-type' : 'application/json'});
                res.end('{error : ' + err + '}')
            } else {
                res.writeHead(200, {'content-type' : 'application/json'});
                res.end(JSON.stringify(objects));
            }
        })
    }
});

app.get('/get_profile', function(req, res) {
    lfs.readObjectFromFile('profile.json', function(userInfo) {
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify(userInfo));        
    });
});

}