/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    lfs = require('../../Common/node/lfs.js'),
    request = require('request');

    
var updateState, auth;

exports.init = function(theauth) {
    auth = theauth;
    try {
        updateState = JSON.parse(fs.readFileSync('updateState.json'));
    } catch (err) { 
        updateState = {checkins:{syncedThrough:0}}; 
    }
}


exports.syncFriends = function(callback) {
    getMe(auth.accessToken, function(err, resp, data) {
        if(err) {
            // do something smrt
            console.error(err);
            return;
        } else if(resp && resp.statusCode > 500) { //fail whale
            console.error(resp);
            return;
        }
        var self = JSON.parse(data).response.user;
        fs.writeFile('profile.json', JSON.stringify(self));
        var userID = self.id;
        fs.mkdir('photos', 0755);
        request.get({uri:'https://api.foursquare.com/v2/users/self/friends.json?oauth_token=' + auth.accessToken}, 
        function(err, resp, body) {
            var friends = JSON.parse(body).response.friends.items;
            var queue = [];
            var users = {
                'id': userID,
                'queue': queue,
                'token': auth.accessToken
            };
            for (var i = 0; i < friends.length; i++)
                queue.push(friends[i]);
            callback(err, friends.length);
            downloadNextUser(users);
        });
    });
}

exports.syncCheckins = function (callback) {
    getMe(auth.accessToken, function(err, resp, data) {
        var self = JSON.parse(data).response.user;
        fs.writeFile('profile.json', JSON.stringify(self));
        getCheckins(self.id, auth.accessToken, 0, function(err, checkins) {
            lfs.appendObjectsToFile('places.json', checkins);
            callback(err, checkins.length);
        });
    });
}


function getMe(token, callback) {
    request.get({uri:'https://api.foursquare.com/v2/users/self.json?oauth_token=' + token}, callback);
}


var checkins_limit = 250;
function getCheckins(userID, token, offset, callback, checkins) {
    if(!checkins)
        checkins = [];
    var latest = 1;
    if(updateState.checkins && updateState.checkins.syncedThrough)
        latest = updateState.checkins.syncedThrough;
    request.get({uri:'https://api.foursquare.com/v2/users/self/checkins.json?limit=' + checkins_limit + '&offset=' + offset + 
                                                            '&oauth_token=' + token + '&afterTimestamp=' + latest},
    function(err, resp, data) {
        var response = JSON.parse(data).response;
        if(!(response.checkins && response.checkins.items)) { //we got nothing
            if(checkins.length > 0)
                updateState.checkins.syncedThrough = checkins[0].createdAt;
                lfs.writeObjectToFile('updateState.json', updateState);
            callback(err, checkins.reverse());
            return;
        }
        var newCheckins = response.checkins.items;
        addAll(checkins, newCheckins);
        if(newCheckins && newCheckins.length == checkins_limit) 
            getCheckins(userID, token, offset + checkins_limit, callback, checkins);
        else {
            if (checkins[0]) {
                updateState.checkins.syncedThrough = checkins[0].createdAt;
            }
            lfs.writeObjectToFile('updateState.json', updateState);
            callback(err, checkins.reverse());
        }
    });
}

function downloadNextUser(users) {
    if (users.queue.length == 0)
        return;

    var friend = users.queue.pop();

    // get extra juicy contact info plz
    request.get({uri:'https://api.foursquare.com/v2/users/' + friend.id + '.json?oauth_token=' + users.token},
    function(err, resp, data) {
        var response = JSON.parse(data);
        if(response.meta.code >= 500) {
            console.error(data);
            return;
        } else if(response.meta.code >= 400) {
            console.error(data);
            return;
        }
        var js = JSON.parse(data).response.user;
        js.name = js.firstName + " " + js.lastName;        
        lfs.appendObjectsToFile('friends.json', [js]);
        if (friend.photo.indexOf("userpix") < 0)
            return downloadNextUser(users);

        // fetch photo
        request.get({uri:friend.photo}, function(err, resp, body) {
            if(err)
                console.error(err);
            else
                fs.writeFileSync('photos/' + friend.id + '.jpg', data, 'binary');
            downloadNextUser(users);
        });
    });
}


function addAll(thisArray, anotherArray) {
    if(!(thisArray && anotherArray && anotherArray.length))
        return;
    for(var i = 0; i < anotherArray.length; i++)
        thisArray.push(anotherArray[i]);
}