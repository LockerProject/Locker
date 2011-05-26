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
    dataStore = require('../../Common/node/ldataStore'),
    app = require('../../Common/node/lapi');
    EventEmitter = require('events').EventEmitter;

    
var updateState, auth, allKnownIDs;

exports.eventEmitter = new EventEmitter();

exports.init = function(theAuth, mongoCollections) {
    auth = theAuth;
    try {
        updateState = JSON.parse(fs.readFileSync('updateState.json'));
    } catch (updateErr) { 
        updateState = {newsfeed:{syncedThrough:0}, wall:{syncedThrough:0}};
    }
    try {
        allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
    } catch (idsError) { 
        allKnownIDs = {}; 
    }
    dataStore.init("id", mongoCollections);
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
						
            for (var i = 0; i < friends.length; i++) {                    
                queue.push(friends[i]);
                if(!knownIDs[friends[i].id]) {
                    newIDs.push(friends[i].id);
                } else {
                    repeatedIDs[friends[i].id] = 1;
                }
            }

            for(var knownID in knownIDs) {
                if(!repeatedIDs[knownID])
                    removedIDs.push(knownID);
            }
            if(newIDs.length < 1) {
                if(removedIDs.length > 0) {
                    var removedCount = removedIDs.length;
                    logRemoved(removedIDs, function(err) {
                        callback(err, 3600, "no new friends, removed " + removedCount + " deleted friends");
                    });
                }
            } else {
  
               for (var j = 0; j < newIDs.length; j++) {
                    allKnownIDs[newIDs[j]] = 1;
                }
                fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
                
                if(removedIDs.length > 0) {
                    logRemoved(removedIDs, function(err) {});
                }
                
                // Careful. downloadUsers has side-effects on newIDs array b/c it can be called recursively.
                // This is why we grab the length before the crazy shit starts to happen.
                var newIDsLength = newIDs.length;
                downloadUsers(newIDs, auth.accessToken, function(err) {
                    callback(err, 3600, "sync'd " + newIDsLength + " new friends");    
                });
            }
        });
    });
};

function logRemoved(ids, callback) {
    if(!ids || !ids.length) {
        fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
        callback();
        return;
    }
    var id = ids.shift();
    dataStore.removeObject("friends", id+'', function(err) {
        delete allKnownIDs[id];
        logRemoved(ids, callback);
        var eventObj = {source:"friends", type:'delete', data:{id:id, deleted:true}};
        exports.eventEmitter.emit('contact/facebook', eventObj);
    });
}

exports.syncCheckins = function (callback) {
    getMe(auth.accessToken, function(err, resp, data) {
        var self = JSON.parse(data).response.user;
        fs.writeFile('profile.json', JSON.stringify(self));
        getCheckins(self.id, auth.accessToken, 0, function(err, checkins) {
            var checkinCount = checkins.length;
            addCheckins(checkins, function() {
                callback(err, 600, "sync'd " + checkinCount + " new checkins");
            });
        });
    });
};

function addCheckins(checkins, callback) {
    if (!checkins || !checkins.length) {
        callback();
    }
    var checkin = checkins.shift();
    if (checkin !== undefined) {
        dataStore.addObject("places", checkin, function(err) {
            var eventObj = {source:'places', type:'new', status:checkin};
            exports.eventEmitter.emit('checkin/foursquare', eventObj);
            addCheckins(checkins, callback);
        });
    }
}

function getMe(accessToken, callback) {
    request.get({uri:'https://graph.facebook.com/me?access_token=' + accessToken}, callback);
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

function downloadUsers(users, accessToken, callback) {
    var coll = users.slice(0);
    (function downloadUser() {
        var friend = coll.splice(0, 1)[0];
        try {
            request.get({uri:'https://graph.facebook.com/?ids=' + idString + '&access_token=' + accessToken},
                         function(err, resp, data) {
                var response = JSON.parse(data);
                if(response.meta.code >= 400) {
                    console.error(data);
                    allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
                    delete allKnownIDs[id];
                    fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
                    if (coll.length === 0) {
                        callback();
                    } else {
                        downloadUser();
                    }
                }
                var js = JSON.parse(data);
                js.name = js.first_name + " " + js.last_name;
                if (js.photo.indexOf("userpix") > 0) {
                    // fetch photo
                    request.get({uri:js.photo}, function(err, resp, body) {
                        if(err)
                            console.error(err);
                        else
                            fs.writeFileSync('photos/' + friend + '.jpg', data, 'binary');
                    });
                }
                var eventObj = {source:'friends', type:'new', status:js};
                exports.eventEmitter.emit('contact/facebook', eventObj);
                dataStore.addObject('friends', js, function(err) {
                    if (coll.length === 0) {
                        callback();
                    } else {
                        downloadUser();
                    }
                });
            });
        } catch (exception) {
            try {
                allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
            } catch (err) { allKnownIDs = {}; }
            for (var i = 0; i < coll.length; i++) {
                delete allKnownIDs[coll[i]];
            }
            fs.writeFileSync('allKnownIDs.json', JSON.stringify(allKnownIDs));
            callback(exception);
        }
    })();
}

function addAll(thisArray, anotherArray) {
    if(!(thisArray && anotherArray && anotherArray.length))
        return;
    for(var i = 0; i < anotherArray.length; i++)
        thisArray.push(anotherArray[i]);
}