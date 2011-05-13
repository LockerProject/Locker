/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs');
var express = require('express'),
    connect = require('connect'),
    url = require('url'),
    sys = require('sys'),
    app = express.createServer(connect.bodyParser()),
    request = require('request'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');
    
var updateState;
var app, auth;

module.exports = function(theapp) {
    app = theapp;
    app.get('/', index);
    this.authComplete = authComplete;
    return this;
}

function authComplete(theauth) {
    auth = theauth;
    readDataFromDisk();
    app.get('/friends', friends);
    app.get('/checkins', checkins);
}

function readDataFromDisk() {
    try {
        updateState = JSON.parse(fs.readFileSync('updateState.json'));
    } catch (err) { updateState = {}; }
}

function index(req, res) {
    if(!(auth && auth.accessToken))
        res.redirect(app.meData.uri + 'go4sq');
    else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end("<html>found a token, load <a href='friends'>friends</a> or <a href='checkins'>checkins</a></html>");
    }
}

function friends(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
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
        res.write('for user ' + self.firstName + ' with id ' + self.id + ': <br>');
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
            locker.diary("syncing "+friends.length+" friends");
            for (var i = 0; i < friends.length; i++) {
                res.write(friends[i].firstName + " " + friends[i].lastName + "<br>");
                queue.push(friends[i]);
            }
            locker.at('/friends', 3600);
            res.end();
            downloadNextUser(users);
        });
    });
}


function checkins(req, res) {
    getMe(auth.accessToken, function(err, resp, data) {
        var self = JSON.parse(data).response.user;
        fs.writeFile('profile.json', JSON.stringify(self));
        getCheckins(self.id, auth.accessToken, 0, function() {
            // lfs.appendObjectsToFile('places.json', newCheckins);
            locker.at('/checkins', 600);
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.end("got  new checkins!");
        });
    });
}

function getMe(token, callback) {
    request.get({uri:'https://api.foursquare.com/v2/users/self.json?oauth_token=' + token}, callback);
}

var checkins_limit = 250;
function getCheckins(userID, token, offset, callback, checkins) {
    var latest = 1;
    if(updateState.checkins && updateState.checkins)
        latest = updateState.checkins;
    request.get({uri:'https://api.foursquare.com/v2/users/self/checkins.json?limit=' + checkins_limit + '&offset=' + offset + 
                                                            '&oauth_token=' + token + '&afterTimestamp=' + latest},
    function(err, resp, data) {
        var newCheckins = JSON.parse(data).response.checkins.items;
        lfs.appendObjectsToFile('checkins.json', newCheckins);
        locker.diary("sync'd "+newCheckins.length+" new checkins");
        if(newCheckins && newCheckins.length == checkins_limit) 
            getCheckins(userID, token, offset + checkins_limit, callback, checkins);
        else {    
            lfs.writeObjectToFile('updateState.json', updateState);
            callback();
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
                sys.debug(err);
            else
                fs.writeFileSync('photos/' + friend.id + '.jpg', data, 'binary');
            downloadNextUser(users);
        });
    });
}


Array.prototype.addAll = function(anotherArray) {
    if(!anotherArray || !anotherArray.length)
        return;
    for(var i = 0; i < anotherArray.length; i++)
        this.push(anotherArray[i]);
}