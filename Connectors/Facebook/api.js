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

module.exports = function(app, callback) {

dataStore.init(function() {
    
// In adherence with the contact/* provider API
// Returns a list of the current set of contacts (friends and followers)
app.get('/allContacts', function(req, res) {
    dataStore.getAllContacts(function(allContacts) {
        res.writeHead(200, {'content-type' : 'application/json'});
        res.end(JSON.stringify(allContacts));
    });
});

// In adherence with the contact/* provider API
// Returns a list of the current set of friends or followers
app.get('/getCurrent/:type', function(req, res) {
    var type = req.params.type;
    if(type == 'friends') {
        dataStore.getPeopleCurrent(req.params.type, function(err, profiles) {
            if(err) {
                console.error(err);
            } else {
                res.writeHead(200, {'content-type' : 'application/json'});
                res.end(JSON.stringify(profiles));
            }
        });
    }
});

// In adherence with the contact/* provider API
app.get('/getAll/:type', function(req, res) {
    var type = req.params.type;
    if(type == 'friends') {
        getPeople({recordID:-1}, res);
    }
});

// In adherence with the contact/* provider API
app.get('/getSince/:type', function(req, res) {
    var type = req.params.type;
    if(type == 'friends') {
        var query = {};
        if(req.query.recordID) {
            query.recordID = req.query.recordID;
        } else if(req.query.timeStamp) {
            query.timeStamp = req.query.timeStamp;
        } else {
            //this is just /getAll
            query = {recordID:-1};
        }
        getPeople(query, res);
    }
});

function getPeople(query, res) {
    dataStore.getPeople(query, function(err, friends) {
        res.writeHead(200, {'content-type' : 'application/json'});
        res.end(JSON.stringify(friends));
    });
}

app.get('/get_profile', function(req, res) {
    lfs.readObjectFromFile('userInfo.json', function(userInfo) {
        res.writeHead(200, {"Content-Type":"text/json"});
        res.end(JSON.stringify(userInfo));        
    });
});

callback();

});
};
