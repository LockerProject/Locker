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
    dataStore = require('../../Common/node/connector/dataStore'),
    deepCompare = require('../../Common/node/deepCompare'),
    utils = require('../../Common/node/connector/utils'),
    app = require('../../Common/node/connector/api'),
    EventEmitter = require('events').EventEmitter;

    
var updateState, auth, allKnownIDs;

exports.eventEmitter = new EventEmitter();

exports.init = function(theauth, mongo) {
    auth = theauth;
    try {
        updateState = JSON.parse(fs.readFileSync('updateState.json'));
    } catch (err) { 
        updateState = {checkins:{syncedThrough:0}}; }
    try {
        allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
    } catch (err) { allKnownIDs = []; }
    dataStore.init("id", mongo);
}


exports.syncFriends = function(callback) {
    getMe(auth.accessToken, function(err, resp, data) {
        if(err) {
            console.error(err);
            return callback(err);
        } else if(resp && resp.statusCode > 500) { //fail whale
            console.error(resp);
            return callback(resp);
        }
        var self = JSON.parse(data).response.user;
        fs.writeFile('profile.json', JSON.stringify(self));
        var userID = self.id;
        fs.mkdir('photos', 0755);
        if (self.photo.indexOf("userpix") > 0) {
            // fetch photo
            request.get({uri:self.photo, encoding: 'binary'}, function(err, resp, body) {
                if (err)
                    console.error(err);
                else
                    fs.writeFile('photos/' + self.id + '.jpg', body, 'binary');
            });
        }
        request.get({uri:'https://api.foursquare.com/v2/users/self/friends.json?oauth_token=' + auth.accessToken}, 
        function(err, resp, body) {
            var friends = JSON.parse(body).response.friends.items.map(function(item) {return item.id});
            var removedIDs = utils.checkDeletedIDs(allKnownIDs, friends);
            var removedCount = removedIDs.length;
            allKnownIDs = friends;
            fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
            
            if (removedCount > 0) {
                logRemoved(removedIDs, function(err) {
                    downloadUsers(friends, auth.accessToken, function(err) {
                        callback(err, 3600, "Updated " + friends.length + " existing friends, deleted " + removedCount + " friends");
                    })
                });
            } else {
                downloadUsers(friends, auth.accessToken, function(err) {
                    callback(err, 3600, "Updated " + friends.length + " friends");    
                });
            }
        });
    });
}


function logRemoved(ids, callback) {
    if(!ids || !ids.length) {
        fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
        callback();
        return;
    }
    var id = ids.shift();
    dataStore.removeObject("friends", id+'', function(err) {
        delete allKnownIDs[id];
        var eventObj = {source:"friends", type:'delete', data:{id:id, deleted:true}};
        exports.eventEmitter.emit('contact/foursquare', eventObj);
        logRemoved(ids, callback);
    });
}

exports.syncCheckins = function (callback) {
    getMe(auth.accessToken, function(err, resp, data) {
        var self = JSON.parse(data).response.user;
        fs.writeFile('profile.json', JSON.stringify(self));
        getCheckins(self.id, auth.accessToken, 0, function(err, checkins) {
            var checkinCount = checkins.length;
            addCheckins(checkins, function() {
                callback(err, 600, "sync'd " + checkinCount + " new my checkins");
            });
        });
    });
}

function addCheckins(checkins, callback) {
    if (!checkins || !checkins.length) {
        callback();
    }
    var checkin = checkins.shift();
    if (checkin != undefined) {
        dataStore.addObject("places", checkin, function(err) {
            var eventObj = {source:'places', type:'new', status:checkin};
            exports.eventEmitter.emit('checkin/foursquare', eventObj);
            addCheckins(checkins, callback);
        })
    }
}

function getMe(token, callback) {
    request.get({uri:'https://api.foursquare.com/v2/users/self.json?oauth_token=' + token}, callback);
}

exports.syncRecent = function (callback) {
    getRecent(auth.accessToken, function(err, resp, data) {
        var checkins = JSON.parse(data).response.recent;
        var checkinCount = checkins.length;
        addRecent(checkins, function() {
            callback(err, 300, "sync'd " + checkinCount + " new friend's checkins");
        });
    });
}

function addRecent(checkins, callback) {
    if (!checkins || !checkins.length) {
        callback();
    }
    var checkin = checkins.shift();
    if (checkin != undefined) {
        dataStore.addObject("recent", checkin, function(err) {
            var eventObj = {source:'recent', type:'new', status:checkin};
            exports.eventEmitter.emit('checkin/foursquare', eventObj);
            addRecent(checkins, callback);
        })
    }
}

function getRecent(token, callback) {
    request.get({uri:'https://api.foursquare.com/v2/checkins/recent.json?limit=100&oauth_token=' + token}, callback);
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
    var coll = users.slice(0);
    (function downloadUser() {
        if (coll.length == 0) {
            return callback();
        }
        var friends = coll.splice(0, 5);
        try {
            var requestUrl = 'https://api.foursquare.com/v2/multi?requests=';
            for (var i = 0; i < friends.length; i++) {
                requestUrl += "/users/" + friends[i] + ",";
            }
            request.get({uri:requestUrl + "&oauth_token=" + token},
                         function(err, resp, data) {
                var response = JSON.parse(data);
                if(response.meta.code >= 400) {
                    allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
                    for (var i = 0; i < friends.length; i++) {
                        delete allKnownIDs[allKnownIDs.indexOf(friends[i])];
                    }
                    fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
                    if (coll.length == 0) {
                        return callback();
                    } else {
                        downloadUser();
                    }
                }
                var responses = JSON.parse(data).response.responses;
                (function parseUser() {
                    var friend = responses.splice(0, 1)[0];
                    if (friend == undefined || friend.response == undefined || friend.response.user == undefined) {
                        downloadUser();
                        return;
                    }
                    var js = friend.response.user;
                    js.name = js.firstName + " " + js.lastName;
                    if (js.photo.indexOf("userpix") > 0) {
                        // fetch photo
                        request.get({uri:js.photo, encoding: 'binary'}, function(err, resp, body) {
                            if (err)
                                console.error(err);
                            else
                                fs.writeFile('photos/' + js.id + '.jpg', body, 'binary');
                        });
                    }
                    dataStore.getCurrent("friends", js.id, function(err, resp) {
                        var eventObj = {};
                        if (resp) {
                            delete resp['_id'];
                            if (deepCompare(js, resp)) {
                                return parseUser();
                            }
                            eventObj = {source:'friends', type:'update', data:js};
                        } else {
                            eventObj = {source:'friends', type:'new', data:js};
                        }
                        exports.eventEmitter.emit('contact/foursquare', eventObj);
                        dataStore.addObject("friends", js, function(err) {
                            parseUser();
                        });                            
                    })
                })();
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