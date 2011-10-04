/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs')
  , request = require('request')
  , auth
  , contacts = []
  , friendIDs = []
  , photos = []
  ;

exports.sync = function(processInfo, cb) {
    auth = processInfo.auth;
    exports.syncFriends(function(err) {
        if (err) console.error(err);
        var responseObj = {data : {}, config: {}};
        responseObj.config.ids = {contact: friendIDs};
        responseObj.data.contact = contacts;
        responseObj.data.photo = photos;
        cb(err, responseObj);
    });
};

exports.syncFriends = function(callback) {
    getMe(function(err, resp, data) {
        if(err) {
            return callback(err);
        } else if(resp && resp.statusCode > 500) { //fail whale
            return callback(resp);
        }
        var self = JSON.parse(data).response.user;
        if (self === undefined) {
            return callback('error attempting to get profile data - ' + data);
        }
        var userID = self.id;
        if (self.photo.indexOf("userpix") > 0) {
            request.get({uri:self.photo, encoding: 'binary'}, function(err, resp, body) {
                if (err)
                    console.error(err);
                else {
                    fs.writeFile('photos/' + self.id + '.jpg', body, 'binary');
                    photos.push({'obj' : {'photoID' : self.id}});
                }

            });
        }
        request.get({uri:'https://api.foursquare.com/v2/users/self/friends.json?oauth_token=' + auth.accessToken + '&limit=500'}, function(err, resp, body) {
            var friends = JSON.parse(body).response.friends.items.map(function(item) {return item.id});
            friendIDs = JSON.parse(body).response.friends.items.map(function(item) {return item.id});
            downloadUsers(friends, function(err) {
                callback(err);
            });
        });
    });
}

function getMe(callback) {
    request.get({uri:'https://api.foursquare.com/v2/users/self.json?oauth_token=' + auth.accessToken}, callback);
}

function downloadUsers(users, callback) {
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
            request.get({uri:requestUrl + "&oauth_token=" + auth.accessToken}, function(err, resp, data) {
                var response = JSON.parse(data);
                if(response.meta.code >= 400) {
                    allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
                    for (var i = 0; i < friends.length; i++) {
                        friends.push({'obj' : {'id' : friends[i]},'type' : 'delete'});
                    }
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
                            else {
                                fs.writeFile('photos/' + js.id + '.jpg', body, 'binary');
                                photos.push({'obj' : {'photoID' : js.id}});
                            }
                        });
                    }
                    contacts.push({'obj' : js, timestamp: new Date(), type : 'new'});
                    parseUser();
                })();
            });
        } catch (exception) {
            return callback(exception);
        }
    })();
}

function addAll(thisArray, anotherArray) {
    if(!(thisArray && anotherArray && anotherArray.length))
        return;
    for(var i = 0; i < anotherArray.length; i++)
        thisArray.push(anotherArray[i]);
}