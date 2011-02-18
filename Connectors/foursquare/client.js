/**
 * Module dependencies.
 */

 
var cwd = process.argv[2];
var port = process.argv[3];
if (!cwd || !port) {
    process.stderr.write("missing dir and port arguments\n");
    process.exit(1);
}
process.chdir(cwd);

var fs = require('fs');
var express = require('express'),
    connect = require('connect'),
    url = require('url'),
    sys = require('sys'),
    app = express.createServer(
        connect.bodyDecoder(),
        connect.cookieDecoder(),
        connect.session({secret : "locker"})
    ),
    http = require('http'),
    wwwdude = require('wwwdude'),
    lfs = require('../../Common/node/lfs.js');

var wwwdude_client = wwwdude.createClient({
    encoding: 'binary'
});

var me = lfs.loadMeData();

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
    if(!me.access_token)
        res.end("<html>you need to <a href='go4sq'>auth w/ foursquare</a> yet</html>");
    else
        res.end("<html>found a token, load <a href='friends'>friends</a> or <a href='checkins'>checkins</a></html>");
});

var oaTokenSecret = "";
app.get('/go4sq',
function(req, res) {
    if(!(me.appKey && me.appSecret)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end("<html>Enter your personal Twitter app info that will be used to sync your data" + 
                " (create a new one <a href='https://foursquare.com/oauth/register'>" + 
                "here</a> using the callback url of " +
                me.uri+"auth) " +
                "<form method='get' action='save'>" +
                    "Client ID: <input name='appKey'><br>" +
                    "Client Secret: <input name='appSecret'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form></html>");
    } else {
        res.writeHead(302);
        sys.debug('redirecting to ' + me.uri + 'auth');
        res.redirect('https://foursquare.com/oauth2/authenticate?client_id=' + me.appKey + '&response_type=code&redirect_uri=' + me.uri + 'auth');
        res.end();
    }
});

function get(host, url, callback) {
    var httpClient = http.createClient(443, host, true);
    var request = httpClient.request('GET', url, {
        host: host
    });
    request.end();
    request.on('response',
    function(response) {
        var data = '';
        response.on('data',
        function(chunk) {
            data += chunk;
        });
        response.on('end',
        function() {
            callback(data);
        });
    });
}

app.get('/auth',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var url = '/oauth2/access_token' +
    '?client_id=' + me.appKey +
    '&client_secret=' + me.appSecret +
    '&grant_type=authorization_code' +
    '&redirect_uri=' + me.uri + 'auth' +
    '&code=' + req.param('code');
    get('foursquare.com', url, function(data) {
        var responseObject = JSON.parse(data);
        me.access_token = responseObject.access_token;
        lfs.syncMeData(me);
        res.end("<html>too legit to quit: " + responseObject.access_token + " so now <a href='/friends'>load friends</a>or <a href='checkins'>checkins</a></html>");
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
    me.appKey = req.param('appKey');
    me.appSecret = req.param('appSecret');

    lfs.syncMeData(me);
    res.end("<html>thanks, now we need to <a href='./go4sq'>auth that app to your account</a>.</html>");
});

app.get('/friends',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    getMe(me.access_token, function(data) {
        var self = JSON.parse(data).response.user;
        me.user_info = self;
        lfs.syncMeData(me);
        res.write('for user ' + self.firstName + ' with id ' + self.id + ': <br>');
        var userID = self.id;
        fs.mkdir('photos', 0755);
        get('api.foursquare.com', '/v2/users/self/friends.json?oauth_token=' + me.access_token, function(data) {
            var friends = JSON.parse(data).response.friends.items;
            var queue = [];
            var users = {
                'id': userID,
                'queue': queue,
                'token': me.access_token
            };
            for (var i = 0; i < friends.length; i++) {
                res.write(friends[i].firstName + " " + friends[i].lastName + "<br>");
                queue.push(friends[i]);
            }
            res.end();
            downloadNextUser(users);
        });
    });
});

app.get('/checkins', 
function(req, res) {
    getMe(me.access_token, function(data) {
        var self = JSON.parse(data).response.user;
        me.user_info = self;
        lfs.syncMeData(me);
        getCheckins(me.user_info.id, me.access_token, 0, function(newCheckins) {
            lfs.appendObjectsToFile('places.json', newCheckins);
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.end();
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

app.listen(port);
console.log("http://localhost:" + port + "/");
