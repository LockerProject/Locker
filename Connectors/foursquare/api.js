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

// In adherence with the contact/* provider API
app.get('/getAll/:type', function(req, res) {
    var type = req.params.type;
    if(type == 'friends')
        getPeople({recordID:-1}, res);
    else if(type == 'places')
        getPlaces({recordID:-1}, res);
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
    } else if(type == 'places') {
        var query = {};
        if(req.query.recordID) {
            query.recordID = req.query.recordID;
        } else if(req.query.timeStamp) {
            query.timeStamp = req.query.timeStamp;
        } else {
            //this is just /getAll
            query = {recordID:-1};
        }
        getPlaces(query, res);
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

function getPlaces(query, res) {
    dataStore.getPlaces(query, function(err, places) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(places));
    });
}

// Reads a list of checkins from disk
function readPlaces(req, res) {
    lfs.readObjectsFromFile('places/places.json', function(data) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        data.reverse();
        res.end(JSON.stringify(data));
    });
}

// Returns the person's checkins
app.get('/get_places', function(req, res) {
    readPlaces(req, res);
});


app.get('/get_profile', function(req, res) {
    lfs.readObjectFromFile('profile.json', function(userInfo) {
        res.writeHead(200, {"Content-Type":"text/json"});
        res.end(JSON.stringify(userInfo));        
    });
});

callback();
    
});

}