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
    app = express.createServer(
        connect.bodyParser(),
        connect.cookieParser(),
        connect.session({secret : "locker"})
    ),
    http = require('http'),
    https = require("https"),
    wwwdude = require('wwwdude'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');

var lockerInfo;
var me;
var accessData;

var wwwdude_client = wwwdude.createClient({
    encoding: 'binary'
});


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
    if(!accessData.accessToken)
        res.end("<html>you need to <a href='go4sq'>auth w/ foursquare</a> yet</html>");
    else
        res.end("<html>found a token, load <a href='friends'>friends</a> or <a href='checkins'>checkins</a></html>");
});

var oaTokenSecret = "";
app.get('/go4sq',
function(req, res) {
    if(!(accessData.appKey && accessData.appSecret)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end("<html>Enter your personal Foursquare app info that will be used to sync your data" + 
                " (create a new one <a href='https://foursquare.com/oauth/register'>" + 
                "here</a> using the callback url of " +
                me.uri+"auth) " +
                "<form method='get' action='save'>" +
                    "Client ID: <input name='appKey'><br>" +
                    "Client Secret: <input name='appSecret'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form></html>");
    } else {
        sys.debug('redirecting to ' + me.uri + 'auth');
        res.redirect('https://foursquare.com/oauth2/authenticate?client_id=' + accessData.appKey + '&response_type=code&redirect_uri=' + me.uri + 'auth');
        res.end();
    }
});

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

app.get('/auth',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var url = '/oauth2/access_token' +
    '?client_id=' + accessData.appKey +
    '&client_secret=' + accessData.appSecret +
    '&grant_type=authorization_code' +
    '&redirect_uri=' + me.uri + 'auth' +
    '&code=' + req.param('code');
    get('foursquare.com', url, function(data) {
        console.log("Got " + data);
        var responseObject = JSON.parse(data);
        accessData.accessToken = responseObject.access_token;
        lfs.writeObjectsToFile("access.json", [accessData]);
        res.end("<html>too legit to quit: " + responseObject.access_token + " so now <a href='friends'>load friends</a> or <a href='checkins'>checkins</a></html>");
    });
});


app.get('/save',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    if(!req.param('appKey') || !req.param('appSecret')) {
        res.end("missing field(s)?");
        return;
    }
    accessData.appKey = req.param('appKey');
    accessData.appSecret = req.param('appSecret');
    lfs.writeObjectsToFile("access.json", [accessData]);
    res.end("<html>thanks, now we need to <a href='./go4sq'>auth that app to your account</a>.</html>");
});

app.get('/friends',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    getMe(accessData.accessToken, function(data) {
        var self = JSON.parse(data).response.user;
        me.user_info = self;
        lfs.syncMeData(me);
        res.write('for user ' + self.firstName + ' with id ' + self.id + ': <br>');
        var userID = self.id;
        fs.mkdir('photos', 0755);
        get('api.foursquare.com', '/v2/users/self/friends.json?oauth_token=' + accessData.accessToken, function(data) {
            var friends = JSON.parse(data).response.friends.items;
            var queue = [];
            var users = {
                'id': userID,
                'queue': queue,
                'token': accessData.accessToken
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

app.get('/getfriends',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    fs.readFile("friends.json", "binary", function(err, file) {  
        if(err) {  
            res.end();  
            return;  
        }  
        res.write(file, "binary");  
        res.end();
    });
});

app.get('/checkins', 
function(req, res) {
    getMe(accessData.accessToken, function(data) {
        var self = JSON.parse(data).response.user;
        me.user_info = self;
        lfs.syncMeData(me);
        getCheckins(me.user_info.id, accessData.accessToken, 0, function(newCheckins) {
            locker.diary("syncing "+newCheckins.length+" new checkins");
            lfs.appendObjectsToFile('places.json', newCheckins);
            locker.at('/checkins', 600);
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.end("got "+newCheckins.length+" new checkins!");
        });
    });
})

function getMe(token, callback) {
    get('api.foursquare.com', '/v2/users/self.json?oauth_token=' + token, callback);
}

var checkins_limit = 500;
function getCheckins(userID, token, offset, callback, checkins) {
    if(!checkins)
        checkins = [];
    var latest = '';
    if(me.checkins && me.checkins.latest)
        latest = '&afterTimestamp=' + me.checkins.latest;
    else if(!me.checkins)
        me.checkins = {};
    get('api.foursquare.com', '/v2/users/self/checkins.json?limit=' + checkins_limit + '&offset=' + offset + '&oauth_token=' + token + latest,
    function(data) {
        var newCheckins = JSON.parse(data).response.checkins.items;
        checkins.addAll(newCheckins);
        if(newCheckins && newCheckins.length == checkins_limit) 
            getCheckins(userID, token, offset + checkins_limit, callback, checkins);
        else {
            if(checkins[0]) {
                me.checkins.latest = checkins[0].createdAt;
                lfs.syncMeData(me);
            }
            callback(checkins.reverse());
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
        wwwdude_client.get(friend.photo)
        .addListener('error',
        function(err) {
            sys.debug(err);
            downloadNextUser(users);
        })
        .addListener('http-error',
        function(data, resp) {
            sys.debug('HTTP Error for: ' + resp.host + ' code: ' + resp.statusCode);
            downloadNextUser(users);
        })
        .addListener('success',
        function(data, resp) {
            fs.writeFileSync('photos/' + friend.id + '.jpg', data, 'binary');
            downloadNextUser(users);
        });
    });
}

// Process the startup JSON object
process.stdin.resume();
process.stdin.on("data", function(data) {
    lockerInfo = JSON.parse(data);
    if (!lockerInfo || !lockerInfo["workingDirectory"]) {
        process.stderr.write("Was not passed valid startup information."+data+"\n");
        process.exit(1);
    }
    locker.initClient(lockerInfo);
    process.chdir(lockerInfo.workingDirectory);
    me = lfs.loadMeData();
    try {
        accessData = JSON.parse(fs.readFileSync("access.json", "utf8"));
    } catch (E) {
        accessData = {};
    }
    app.listen(lockerInfo.port, "localhost", function() {
        process.stdout.write(data);
    });
});
