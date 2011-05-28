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
        updateState = {home:{syncedThrough:0}, feed:{syncedThrough:0}};
    }
    try {
        allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
    } catch (idsError) { 
        allKnownIDs = {};
    }
    dataStore.init('id', mongoCollections);
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
        request.get({uri:'https://graph.facebook.com/me/friends?access_token=' + auth.accessToken + '&date_format=U'}, 
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
    dataStore.removeObject('friends', id + '', function(err) {
        delete allKnownIDs[id];
        logRemoved(ids, callback);
        var eventObj = {source:'friends', type:'delete', data:{id:id, deleted:true}};
        exports.eventEmitter.emit('contact/facebook', eventObj);
    });
}

function downloadUsers(theUsers, token, callback) {
    var users = theUsers;
    var idString = '';
    var length = users.length;
    for (var i = 0; i < length && i < 100; i++) {
       idString += users.pop() + ',';
    }
    idString = idString.substring(0, idString.length - 1);
    request.get({uri:'https://graph.facebook.com/?ids=' + idString + '&access_token=' + token + '&date_format=U'}, 
        function(err, resp, data) {
            if (err) {
                console.error(err);
                callback(err);
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
           var eventCallback = function(err) {
               var eventObj = {source:'friends', type:'new', data:result[property]};
               exports.eventEmitter.emit('contact/facebook', eventObj);
           };
           
           for(var property in result) {
               if (result.hasOwnProperty(property)) {
                   dataStore.addObject('friends', result[property], eventCallback());
               }
           } 
       });
    
    if (users.length > 0) {
        downloadUsers(users, token, callback);
    }
    callback(null);
}

exports.syncNewsfeed = function (callback) {
    getMe(auth.accessToken, function(err, resp, data) {
        var self = JSON.parse(data);
        fs.writeFile('profile.json', JSON.stringify(self));
        getPosts(self.id, 'home', auth.accessToken, 0, function(err, posts) {
            var postsCount = posts.length;
            addNewsfeedPosts(posts, function() {
                callback(err, 600, "sync'd " + postsCount + " new newsfeed posts");
            });
        });
    });
};

function addNewsfeedPosts(posts, callback) {
    if (!posts || !posts.length) {
        callback();
    }
    var post = posts.shift();
    if (post !== undefined) {
        dataStore.addObject('newsfeed', post, function(err) {
            var eventObj = {source:'status', type:'new', status:post};
            exports.eventEmitter.emit('status/facebook', eventObj);
            addNewsfeedPosts(posts, callback);
        });
    }
}

exports.syncWall = function (callback) {
    getMe(auth.accessToken, function(err, resp, data) {
        var self = JSON.parse(data);
        fs.writeFile('profile.json', JSON.stringify(self));
        getPosts(self.id, 'feed', auth.accessToken, 0, function(err, posts) {
            var postsCount = posts.length;
            addWallPosts(posts, function() {
                callback(err, 600, "sync'd " + postsCount + " new wall posts");
            });
        });
    });
};

function addWallPosts(posts, callback) {
    if (!posts || !posts.length) {
        callback();
    }
    var post = posts.shift();
    if (post !== undefined) {
        dataStore.addObject('wall', post, function(err) {
            var eventObj = {source:'status', type:'new', status:post};
            exports.eventEmitter.emit('status/facebook', eventObj);
            addWallPosts(posts, callback);
        });
    }
}

function getMe(accessToken, callback) {
    request.get({uri:'https://graph.facebook.com/me?access_token=' + accessToken + '&date_format=U'}, callback);
}

var postLimit = 250;
function getPosts(userID, type, token, offset, callback, posts) {
    if(!posts) {
        posts = [];
    }
    var latest = 1;
    if(updateState[type] && updateState[type].syncedThrough) {
        latest = updateState[type].syncedThrough;
    }
    request.get({uri:'https://graph.facebook.com/me/' + type + '?limit=' + postLimit + '&offset=' + offset + 
                                                            '&access_token=' + token + '&since=' + latest +
                                                            '&date_format=U'},
    function(err, resp, data) {
        var newPosts = JSON.parse(data).data;
        addAll(posts, newPosts.reverse());
        if(newPosts && newPosts.length == postLimit) {
            getPosts(userID, type, token, offset + postsLimit, callback, posts);
        } else {
            if (posts.length > 0) {
                updateState[type].syncedThrough = posts[posts.length - 1].created_time;
                lfs.writeObjectToFile('updateState.json', updateState);
            }
            callback(err, posts.reverse());
        }
    });
}

function addAll(thisArray, anotherArray) {
    if(!(thisArray && anotherArray && anotherArray.length))
        return;
    for(var i = 0; i < anotherArray.length; i++)
        thisArray.push(anotherArray[i]);
}