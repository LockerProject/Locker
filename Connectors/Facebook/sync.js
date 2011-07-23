/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    lfs = require('lfs'),
    request = require('request'),
    async = require('async'),
    sys = require('sys'),
    dataStore = require('../../Common/node/connector/dataStore'),
    app = require('../../Common/node/connector/api');
    EventEmitter = require('events').EventEmitter;

    
var updateState, auth, allKnownIDs;

exports.eventEmitter = new EventEmitter();

exports.init = function(theAuth, mongo) {
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
    dataStore.init('id', mongo);
};

exports.syncFriends = function(callback) {
    fs.mkdir('photos', 0755);
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
        request.get({uri:'https://graph.facebook.com/' + self.id + '/picture?access_token=' + auth.accessToken}, function(err, resp, body) {
            var ct = resp.headers['content-type'];
            var photoExt = ct.substring(ct.lastIndexOf('/')+1);
            fs.writeFile('photos/' + self.id + "." + photoExt, body, 'binary');
        })
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
                }else{
                    callback(null, 3600, "no friend changes");
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
    syncFeed('home', 'newsfeed', callback);
};

exports.syncWall = function (callback) {
    syncFeed('feed', 'wall', callback);
};

function syncFeed(feed, type, callback) {
    getMe(auth.accessToken, function(err, resp, data) {
        var self = JSON.parse(data);
        fs.writeFile('profile.json', JSON.stringify(self));
        getPosts(self.id, feed, auth.accessToken, 0, function(err, posts) {
            var postsCount = posts.length;
            addPosts(type, posts, function() {
                callback(err, 600, "sync'd " + postsCount + " new " + type + " posts");
            });
        });
    });
    
}

function addPosts(type, posts, callback) {
    if (!posts || !posts.length) {
        callback();
        return;
    }
    var post = posts.shift();
    if (post !== undefined) {
        dataStore.addObject(type, post, function(err) {
            if(post.type === 'link') {
                var eventObj = {source:type, type:'new', data:{url:post.link, sourceObject:post}};
                exports.eventEmitter.emit('link/facebook', eventObj);
            }
            addPosts(type, posts, callback);
        });
    }
    
}

exports.syncProfile = function(callback) {
    getMe(auth.accessToken, function(err, resp, data) {
        if(err) {
            callback(err, 3600, data);
        } else {
            var profile = JSON.parse(data);
            lfs.writeObjectToFile('profile.json', profile);
            callback(null, 3600, 'syncd profile');
        }
    });
}

function getMe(accessToken, callback) {
    request.get({uri:'https://graph.facebook.com/me?access_token=' + accessToken + '&date_format=U'}, callback);
}

// this function accidentially turned out to be really async dense, sorry, blame brendan and ryan
var photocnt = 0;
exports.syncPhotos = function(cb) 
{
    var albums = [];
    photocnt = 0;
    getAlbums('https://graph.facebook.com/me/albums?access_token=' + auth.accessToken + '&date_format=U', albums, function(albums){
        async.forEach(albums,function(album, cb){
            getAlbum('https://graph.facebook.com/'+album.id+'/photos?access_token=' + auth.accessToken + '&date_format=U',cb); // recurse till done
        }, function(err){
            console.log("finished processing all photos: "+photocnt);
            cb(null, "got "+albums.length+" albums and "+photocnt+" photos");
        })
    })
} 

// recurse getting all the photos in an album
function getAlbum(uri, callback) {
    request.get({uri:uri}, function(err, resp, data){
        js = JSON.parse(data);
        if(!js || !js.data || js.data.length == 0)
        { // end of the line folks, please exit to the up
            return callback();
        }
        // omg4realz
        async.forEach(js.data,function(photo,cb){
            photocnt++;
            // need to associate the album info?
            dataStore.addObject('photos', photo, function(err) {
                var eventObj = {source:'photo', data:{id:photo.id, sourceObject:photo}};
                exports.eventEmitter.emit('photo/facebook', eventObj);
                cb();
            });
        },function(err){
            if(js.paging && js.paging.next)
            {
                getAlbum(js.paging.next,callback);
            }else{
                callback();
            }
        });
    });
}

// recurse getting all the albums
function getAlbums(uri, albums, callback) {
    request.get({uri:uri}, function(err, resp, data){
        js = JSON.parse(data);
        albums = albums.concat(js.data);
        if(js.paging && js.paging.next)
        {
            getAlbums(js.paging.next,albums,callback);
        }else{
            callback(albums);
        }
    });
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
            getPosts(userID, type, token, offset + postLimit, callback, posts);
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
