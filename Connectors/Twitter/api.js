/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/*
*
* Data access endpoints.
*
*/

var lfs = require('../../Common/node/lfs.js');
var fs = require('fs');
var dataStore = require('./dataStore.js');
var validTypes = [];

module.exports = function(app, theMongoCollections) {

dataStore.init(theMongoCollections);

// In adherence with the contact/* provider API
// Returns a list of the current set of friends or followers
app.get('/getCurrent/:type', function(req, res) {
    var type = req.params.type;
    if(type == 'followers' || type == 'friends') {
        dataStore.getAllCurrent(req.params.type, function(err, profiles) {
            if(err) {
                
            } else {
                res.writeHead(200, {'content-type' : 'application/json'});
                res.end(JSON.stringify(profiles));
            }
        });
    }    
    else if(type == 'home_timeline' || type == 'mentions' || type == 'user_timeline') {
        dataStore.getAllCurrent(type, function(err, statuses) {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(statuses));
        });
    }
});


app.get('/get_profile', function(req, res) {
    lfs.readObjectFromFile('userInfo.json', function(userInfo) {
        res.writeHead(200, {"Content-Type":"text/json"});
        res.end(JSON.stringify(userInfo));        
    });
});


};
