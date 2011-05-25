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
        getPeople(req.params.type, 0, res);
    else if(type == 'home_timeline' || type == 'mentions' || type == 'user_timeline')
        getStatuses(type, 0, res);
});

// In adherence with the contact/* provider API
app.get('/getSince/:type', function(req, res) {
    var type = req.params.type;
        var timeStamp = req.query.timeStamp || 1;
    if(type == 'followers' || type == 'friends') {
        getPeople(type, timeStamp, res);
    } else if(type == 'home_timeline' || type == 'mentions' || type == 'user_timeline') {
        getStatuses(type, timeStamp, res);
    }
});

function getPeople(type, timeStamp, res) {
    dataStore.getPeople(type, timeStamp, function(err, allPeople) {
        res.writeHead(200, {'content-type' : 'application/json'});
        res.end(JSON.stringify(allPeople));
    });
}

function getStatuses(type, timeStamp, res) {
    dataStore.getStatuses(type, timeStamp, function(err, statuses) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(statuses));
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
