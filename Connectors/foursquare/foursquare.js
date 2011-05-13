/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/**
 * Module dependencies.
 */
var fs = require('fs');
var express = require('express'),
    connect = require('connect'),
    url = require('url'),
    sys = require('sys'),
    app = express.createServer(connect.bodyParser()),
    http = require('http'),
    https = require("https"),
    request = require('request'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js'),
    authLib = require('./auth');

var lockerInfo;
var me;
var auth, updateState;



Array.prototype.addAll = function(anotherArray) {
    if(!anotherArray || !anotherArray.length)
        return;
    for(var i = 0; i < anotherArray.length; i++)
        this.push(anotherArray[i]);
}

//app.set('views', __dirname);

app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    if(!(auth && auth.accessToken))
        res.end("<html>you need to <a href='go4sq'>auth w/ foursquare</a> yet</html>");
    else
        res.end("<html>found a token, load <a href='friends'>friends</a> or <a href='checkins'>checkins</a></html>");
});

function readDataFromDisk() {
    try {
        updateState = JSON.parse(fs.readFileSync('updateState.json'));
    } catch (err) { updateState = {}; }
}

function get(host, url, callback) {
    var httpClient = http.createClient(443, host, true);
    var httpOpts = {
        "host" : host,
        port : 443,
        path: url,
        method: "GET"
    };
    var request = https.request(httpOpts, function(res) {
        var data = '';
        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on('end', function() {
            callback(data);
        });
    });
    request.end();
}

app.get('/friends',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    getMe(auth.accessToken, function(data) {
        var self = JSON.parse(data).response.user;
        fs.writeFile('profile.json', JSON.stringify(self));
//        me.user_info = self;
//        lfs.syncMeData(me);
        res.write('for user ' + self.firstName + ' with id ' + self.id + ': <br>');
        var userID = self.id;
        fs.mkdir('photos', 0755);
        get('api.foursquare.com', '/v2/users/self/friends.json?oauth_token=' + auth.accessToken, function(data) {
            var friends = JSON.parse(data).response.friends.items;
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
});


app.get('/checkins', 
function(req, res) {
    getMe(auth.accessToken, function(data) {
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
})

function getMe(token, callback) {
    get('api.foursquare.com', '/v2/users/self.json?oauth_token=' + token, callback);
}

var checkins_limit = 250;
function getCheckins(userID, token, offset, callback, checkins) {
    var latest = 1;
    if(updateState.checkins && updateState.checkins)
        latest = updateState.checkins;
    get('api.foursquare.com', '/v2/users/self/checkins.json?limit=' + checkins_limit + '&offset=' + offset + 
                                                            '&oauth_token=' + token + '&afterTimestamp=' + latest,
    function(data) {
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
    get('api.foursquare.com', '/v2/users/' + friend.id + '.json?oauth_token=' + users.token,
    function(data) {
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

// Process the startup JSON object
process.stdin.setEncoding('utf8');
process.stdin.on("data", function(data) {
    // Do the initialization bits
    var processInfo = JSON.parse(data);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    
    app.meData = lfs.loadMeData();
    // Adds the internal API to the app because it should always be available
    require(__dirname + "/api.js")(app);
    // If we're not authed, we add the auth routes, otherwise add the webservice
    authLib.authAndRun(app, function(newAuth) {
        auth = newAuth;
        readDataFromDisk();
        console.error('got auth:', auth);
        // require(__dirname + "/webservice.js")(app, authLib.auth);
    });
    
    app.listen(processInfo.port, "localhost", function() {
        process.stdout.write(data);
    });
});
process.stdin.resume();
