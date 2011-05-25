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
    } catch (updateErr) { 
        updateState = {checkins:{syncedThrough:0}}; }
    try {
        allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
    } catch (idErr) { allKnownIDs = {}; }
    dataStore.init(function() {
        callback();
    });
};

exports.syncFriends = function(callback) {
    getMe(auth.accessToken, function(err, resp, data) {
        if(err) {
            // do something smrt
            console.error(err);
            return;
        } else if(resp && resp.statusCode > 500) {
            console.error(resp);
            return;
        }
        var self = JSON.parse(data);
        fs.writeFile('profile.json', JSON.stringify(self));
        var userID = self.id;
        request.get({uri:'https://graph.facebook.com/me/friends?access_token=' + auth.accessToken}, 
        function(err, resp, body) {
            var newIDs = [];
            var knownIDs = allKnownIDs;
            var repeatedIDs = [];
            var removedIDs = [];
            
            var friends = JSON.parse(body).data;
            var queue = [];
            var users = {
                'id': userID,
                'queue': queue,
                'token': auth.accessToken
            };
            
            for(var i in friends) {
                if (friends.hasOwnProperty(i)) {
                    queue.push(friends[i]);
                    if(!knownIDs[friends[i].id]) {
                        newIDs.push(friends[i].id);
                    } else {
                        repeatedIDs[friends[i].id] = 1;
                    }
                }
            }

            for(var knownID in knownIDs) {
                if(!repeatedIDs[knownID])
                    removedIDs.push(knownID);
            }
            if(newIDs.length < 1) {
                if(removedIDs.length > 0) {
                    logRemoved(removedIDs);
                }
                callback(err, 3600, "no new friends, removed " + removedIDs.length + " deleted friends");
            } else {
                for (var j = 0; j < newIDs.length; j++) {
                    allKnownIDs[newIDs[j]] = 1;
                }
                fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
                var newIDsLength = newIDs.length;
                
                downloadUsers(newIDs, auth.accessToken);
                if(removedIDs.length > 0) {
                    logRemoved(removedIDs);
                }
                callback(err, 3600, "sync'd " + newIDsLength + " new friends");    
            }
        });
    });
};

function logRemoved(ids) {
    if(!ids)
        return;
    ids.forEach(function(id) {
        dataStore.logRemovePerson(id);
        delete allKnownIDs[id];
    });
    fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
}

function getMe(accessToken, callback) {
    request.get({uri:'https://graph.facebook.com/me?access_token=' + accessToken}, callback);
}

function downloadUsers(theUsers, token) {
    var users = theUsers;
    var idString = '';
    var length = users.length;
    for (var i = 0; i < length && i < 100; i++) {
       idString += users.pop() + ',';
    }
    idString = idString.substring(0, idString.length - 1);

    // get extra juicy contact info plz
    request.get({uri:'https://graph.facebook.com/?ids=' + idString + '&access_token=' + token}, 
        function(err, resp, data) {
            if (err) {
                console.error(err);
                return;
            }
            var response = JSON.parse(data);
            if(response.hasOwnProperty('error')) {
                
               console.error(data);
               allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
               
               var ids = idString.split(',');
               for(var j = 0; j < ids.length; j++) {
                   delete allKnownIDs[ids[j]];
               }
               
               fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
               return;
           }
           var result = JSON.parse(data);
       
           for(var property in result) {
               if (result.hasOwnProperty(property)) {
                   dataStore.addFriend(result[property]);
               }
           } 
       });
    
    if (users.length > 0) {
        downloadUsers(users, token);
    }
}


function addAll(thisArray, anotherArray) {
    if(!(thisArray && anotherArray && anotherArray.length))
        return;
    for(var i = 0; i < anotherArray.length; i++)
        thisArray.push(anotherArray[i]);
}