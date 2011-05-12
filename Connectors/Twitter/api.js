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


module.exports = function(app) {

// In adherence with the contact/* provider API
// Returns a list of the current set of contacts (friends and followers)
app.get('/allContacts', function(req, res) {
    lfs.readObjectsFromFile('friends.json', function(frnds) {
        var friends = frnds;
        var allContacts = {};
        for(var i in friends) {
            var friend = friends[i];
            if(!friend)
                continue;
            friend.isFriend = true;
            allContacts[friend.screen_name] = friend;
        }
        lfs.readObjectsFromFile('followers.json', function(fllwrs) {
            var followers = fllwrs;
            for(var j in followers) {
                var follower = followers[j];
                if(!follower)
                    continue;
                if(allContacts[follower.screen_name]) {
                    allContacts[follower.screen_name].isFollower = true;
                } else {
                    follower.isFollower = true;
                    allContacts[follower.screen_name] = follower;
                }
            }
            var arr = [];
            for(var k in allContacts)
                arr.push(allContacts[k]);
            res.writeHead(200, {'content-type' : 'application/json'});
            res.end(JSON.stringify(arr));
        });
    });
});

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

return this;
};
