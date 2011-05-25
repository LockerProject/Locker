/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    lfs = require("../../Common/node/lfs.js"),
    dataStore = require('./dataStore.js');


module.exports = function(app, callback) {

dataStore.init(function() {

// In adherence with the contact/* provider API
// Returns a list of the current set of contacts (friends and followers)
app.get('/allContacts', function(req, res) {
    dataStore.getPeople(function(err, allContacts) {
        if(err) {
        } else {
            res.writeHead(200, {'content-type' : 'application/json'});
            res.end(JSON.stringify(allContacts));
        }
    });
});

// In adherence with the contact/* provider API
// Returns a list of the current set of friends or followers
app.get('/getCurrent/friends', function(req, res) {
    dataStore.getPeopleCurrent(function(err, profiles) {
        if(err) {
        } else {
            res.writeHead(200, {'content-type' : 'application/json'});
            res.end(JSON.stringify(profiles));
        }
    });
});

app.get('/getCurrent/profile', function(req, res) {
    lfs.readObjectFromFile('profile.json', function(userInfo) {
        res.writeHead(200, {"Content-Type":"text/json"});
        res.end(JSON.stringify(userInfo));        
    });
});

// In adherence with the contact/* provider API
app.get('/getAll/:type', function(req, res) {
    var type = req.params.type;
    if(type == 'friends')
        getPeople({recordID:-1}, res);
});

// In adherence with the contact/* provider API
app.get('/getSince/:type', function(req, res) {
    var type = req.params.type;
    var query = {};
    if(type == 'friends') {
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
    dataStore.getPeople(query, function(err, allPeople) {
        if(err) {
            res.writeHead(500, {'content-type' : 'application/json'});
            res.end(JSON.stringify(err));
        } else {
            res.writeHead(200, {'content-type' : 'application/json'});
            res.end(JSON.stringify(allPeople));
        }
    });
}

callback();
    
});

};