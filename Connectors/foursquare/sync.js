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
    request = require('request'),
    dataStore = require('./dataStore');

    
var updateState, auth, allKnownIDs;

exports.init = function(theauth, callback) {
    auth = theauth;
    try {
        updateState = JSON.parse(fs.readFileSync('updateState.json'));
    } catch (err) { 
        updateState = {checkins:{syncedThrough:0}}; }
    try {
        allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
    } catch (err) { allKnownIDs = {}; }
    dataStore.init(function() {
        callback();
    });
}


exports.syncFriends = function(callback) {
    getMe(auth.accessToken, function(err, resp, data) {
        var newIDs = [];
        var knownIDs = allKnownIDs;
        var repeatedIDs = [];
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
            for (var i = 0; i < friends.length; i++) {
                queue.push(friends[i]);
                if(!knownIDs[friends[i].id])
                    newIDs.push(friends[i].id);
                else
                    repeatedIDs[friends[i].id] = 1;
                var removedIDs = [];
                for(var knownID in knownIDs) {
                    if(!repeatedIDs[knownID])
                        removedIDs.push(knownID);
                }
            }
            if(newIDs.length < 1) {
                if(removedIDs.length > 0)
                    logRemoved(removedIDs);
            } else {
                for (var i = 0; i < newIDs.length; i++) {
                    allKnownIDs[newIDs[i]] = 1;
                }
                fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
                downloadUsers(newIDs, auth.accessToken);
                if(removedIDs.length > 0)
                    logRemoved(removedIDs);
            }
            callback(err, newIDs.length);
        });
    });
}


function logRemoved(ids) {
    if(!ids)
        return;
    ids.forEach(function(id) {
        dataStore.logRemovePerson(id);
        delete allKnownIDs[id];
    });
    fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
}

exports.syncCheckins = function (callback) {
    getMe(auth.accessToken, function(err, resp, data) {
        var self = JSON.parse(data).response.user;
        fs.writeFile('profile.json', JSON.stringify(self));
        getCheckins(self.id, auth.accessToken, 0, function(err, checkins) {
            for (var i = 0; i < checkins.length; i++)
                dataStore.addPlace(checkins[i]);
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

function downloadUsers(users, token, callback) {
    for (var i = 0; i < users.length; i++) {
       var friend = users[i];

       // get extra juicy contact info plz
       request.get({uri:'https://api.foursquare.com/v2/users/' + friend + '.json?oauth_token=' + token},
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
           if (js.photo.indexOf("userpix") > 0) {
               // fetch photo
               request.get({uri:js.photo}, function(err, resp, body) {
                  if(err)
                      console.error(err);
                  else
                      fs.writeFileSync('photos/' + friend + '.jpg', data, 'binary');
              });
           }
           allKnownIDs[friend] = 1;
           dataStore.addFriend(js);
       });
    }
}


function addAll(thisArray, anotherArray) {
    if(!(thisArray && anotherArray && anotherArray.length))
        return;
    for(var i = 0; i < anotherArray.length; i++)
        thisArray.push(anotherArray[i]);
}