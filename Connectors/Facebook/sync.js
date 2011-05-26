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

exports.init = function(theAuth, mongoCollections) {
    console.log('sync.init');
    auth = theAuth;
    try {
        updateState = JSON.parse(fs.readFileSync('updateState.json'));
    } catch (updateErr) { 
        updateState = {links:{wall:{syncedThrough: 0}, newsfeed:{syncedThrough: 0}}};
    }
    try {
        allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
    } catch (idErr) { 
        allKnownIDs = {friends:{}, links:{wall:{}, newsfeed:{}}};
    }
    dataStore.init(mongoCollections);
};

exports.pullNewsfeed = function(endpoint, max_id, since_id, page, items, callback) {
    console.log('sync.pullNewsfeed');
    // if(!page)
    //         page = 1;
    //     var params = {token: auth.token, count: 200, page: page, include_entities:true};
    //     if(max_id)
    //         params.max_id = max_id;
    //     if(since_id)
    //         params.since_id = since_id;
    //     requestCount++;
    //     getTwitterClient().apiCall('GET', '/statuses/' + endpoint + '.json', params, function(error, result) {
    //         if(error) {
    //             if(error.statusCode >= 500) { //failz-whalez, hang out for a bit
    //                 setTimeout(function(){
    //                     pullTimelinePage(endpoint, max_id, since_id, page, items, callback);
    //                 }, 10000);
    //             }
    //             require("sys").puts(error.stack );
    //             sys.debug('error from twitter:' + sys.inspect(error));
    //             return;
    //         }
    //         if(result.length > 0) {
    //             var id = result[0].id;
    //             if(!latests[endpoint].latest || id > latests[endpoint].latest)
    //                 latests[endpoint].latest = id;
    //             for(var i = 0; i < result.length; i++)
    //                 items.push(result[i]);
    // 
    //             if(!max_id)
    //                 max_id = result[0].id;
    //             page++;
    //             if(requestCount > 300) {
    //                 sys.debug('sleeping a bit...');
    //                 setTimeout(function() {
    //                     pullTimelinePage(endpoint, max_id, since_id, page, items, callback);
    //                 }, 30000);
    //             } else {
    //                 pullTimelinePage(endpoint, max_id, since_id, page, items, callback);
    //             }
    //         } else if(callback) {
    //             lfs.writeObjectToFile('latests.json', latests);
    //             callback();
    //         }
    //     });
};

exports.pullWall = function(endpoint, max_id, since_id, page, items, callback) {
    console.log('sync.pullWall');
   
};

exports.syncFriends = function(callback) {
    console.log('sync.syncFriends');
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
                    logRemoved(removedIDs);
                }
                callback(err, 3600, "no new friends, removed " + removedIDs.length + " deleted friends");
            } else {
                for (var j = 0; j < newIDs.length; j++) {
                    allKnownIDs[newIDs[j]] = 1;
                }
                fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
                var newIDsLength = newIDs.length;
                
                // Careful. downloadUsers has side-effects on newIDs array b/c it can be called recursively.
                // This is why we grab the length above before the crazy shit starts to happen.
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