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
    if(type == 'followers' || type == 'friends') {
        dataStore.getPeopleCurrent(req.params.type, function(err, profiles) {
            if(err) {
                
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
    if(type == 'followers' || type == 'friends')
        getPeople(req.params.type, {recordID:-1}, res);
    else if(type == 'home_timeline' || type == 'mentions')
        getStatuses(type, {recordID:-1}, res);
});

// In adherence with the contact/* provider API
app.get('/getSince/:type', function(req, res) {
    var type = req.params.type;
    if(type == 'followers' || type == 'friends') {
        var query = {};
        if(req.query.recordID) {
            query.recordID = req.query.recordID;
        } else if(req.query.timeStamp) {
            query.timeStamp = req.query.timeStamp;
        } else {
            //this is just /getAll
            query = {recordID:-1};
        }
        getPeople(type, query, res);
    } else if(type == 'home_timeline' || type == 'mentions') {
        var query = {};
        if(req.query.recordID) {
            query.recordID = req.query.recordID;
        } else if(req.query.timeStamp) {
            query.timeStamp = req.query.timeStamp;
        } else {
            //this is just /getAll
            query = {recordID:-1};
        }
        getStatuses(type, query, res);
    }
});

function getPeople(type, query, res) {
    dataStore.getPeople(type, query, function(err, allPeople) {
        res.writeHead(200, {'content-type' : 'application/json'});
        res.end(JSON.stringify(allPeople));
    });
}

function getStatuses(type, query, res) {
    dataStore.getStatuses(type, query, function(err, statuses) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(statuses));
    });
}

// Reads a list of statuses from disk
function readStatuses(req, res, type) {
    lfs.readObjectsFromFile(type + '.json', function(data) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        data.reverse();
        res.end(JSON.stringify(data));
    });
}

// Returns the person's home timeline
app.get('/get_home_timeline', function(req, res) {
    readStatuses(req, res, 'home_timeline');
});

// Returns the person's mentions
app.get('/get_mentions', function(req, res) {
    readStatuses(req, res, 'mentions');
});

app.get('/get_profile', function(req, res) {
    lfs.readObjectFromFile('userInfo.json', function(userInfo) {
        res.writeHead(200, {"Content-Type":"text/json"});
        res.end(JSON.stringify(userInfo));        
    });
});

callback();

});
};
