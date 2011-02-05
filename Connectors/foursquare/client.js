/**
 * Module dependencies.
 */

 
var appKey = process.argv[2];
var appSecret = process.argv[3];
if (!appKey || !appSecret) {
    console.log("node client.js appkey appsecret");
    console.log("create one at https://foursquare.com/oauth/");
    process.exit(1);
}

var fs = require('fs');
var express = require('express'),
connect = require('connect'),
app = express.createServer(
connect.bodyDecoder(),
connect.cookieDecoder(),
connect.session({secret : "locker"})
);

try { 
    fs.mkdir('my', 0755);
} catch(err) {
    console.log(err);
}

var http = require('http');
var wwwdude = require('wwwdude');
var wwwdude_client = wwwdude.createClient({
    encoding: 'binary'
});

app.set('views', __dirname);

app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    fs.readFile("access.token",
    function(err, data) {
        if (err)
        res.end("you need to <a href='/go4sq'>auth w/ foursquare</a> yet");
        else
        res.end("found a token, <a href='/friends'>load friends</a>");
    });
});

var oaTokenSecret = "";
app.get('/go4sq',
function(req, res) {
    res.writeHead(302);
    res.redirect('https://foursquare.com/oauth2/authenticate?client_id=' + appKey + '&response_type=code&redirect_uri=http://127.0.0.1:3004/auth');
    res.end();
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
    console.log("incoming code " + req.param('code'));
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var url = '/oauth2/access_token' +
    '?client_id=' + appKey +
    '&client_secret=' + appSecret +
    '&grant_type=authorization_code' +
    '&redirect_uri=http://127.0.0.1:3004/auth' +
    '&code=' + req.param('code');
    console.log('url = ' + url);
    get('foursquare.com', url,
    function(data) {
        var responseObject = JSON.parse(data);
        console.log('access_token = ' + responseObject.access_token);
        fs.writeFile("access.token", responseObject.access_token);
        res.end("too legit to quit: " + responseObject.access_token + " so now <a href='/friends'>load friends</a>");
    });
});


app.get('/friends',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    fs.readFile("access.token", "utf-8",
    function(err, token) {
        console.log("loaded token " + token);
        if (err)
        res.end("no token you need to <a href='/go4sq'>auth w/ 4sq</a> yet");
        else {
            get('api.foursquare.com', '/v2/users/self.json?oauth_token=' + token,
            function(data) {
                var self = JSON.parse(data).response.user;
                res.write('for user ' + self.firstName + ' with id ' + self.id + ': <br>');
                var userID = self.id;
                fs.mkdir('my/' + userID, 0755);
                fs.mkdir('my/' + userID + '/photos/', 0755);
                get('api.foursquare.com', '/v2/users/self/friends.json?oauth_token=' + token,
                function(data) {
                    var friends = JSON.parse(data).response.friends.items;
                    var stream = fs.createWriteStream('my/' + userID + '/contacts.json');
                    var queue = [];
                    var users = {
                        'id': userID,
                        'stream': stream,
                        'queue': queue,
                        'token': token
                    };
                    for (var i = 0; i < friends.length; i++) {
                        res.write(friends[i].firstName + " " + friends[i].lastName + "<br>");
                        queue.push(friends[i]);
                    }
                    res.end();
                    downloadNextUser(users);
                });
                getCheckins(userID, token, 0, function() {
                    res.end();
                });
            })
        }
    });
});

var checkins_limit = 500;
function getCheckins(userID, token, offset, callback) {
    get('api.foursquare.com', '/v2/users/self/checkins.json?limit=' + checkins_limit + '&offset=' + offset + '&oauth_token=' + token,
    function(data) {
        var stream = fs.createWriteStream('my/' + userID + '/places.json', {'flags' : 'a'});
        var checkins = JSON.parse(data).response.checkins.items;
        for (var i = 0; i < checkins.length; i++) {
            if (checkins[i]) {
                stream.write(JSON.stringify(checkins[i]) + "\n");
            }
        }
        stream.end();
        if(checkins.length == checkins_limit) 
            getCheckins(userID, token, offset + checkins_limit, callback);
        else
            callback();
    });
}

function downloadNextUser(users) {
    if (users.queue.length == 0)
    {
        console.log("done with user " + users.id);
        users.stream.end();
        return;
    }

    var friend = users.queue.pop();
    console.log("fetching user " + friend.id);

    // get extra juicy contact info plz
    get('api.foursquare.com', '/v2/users/' + friend.id + '.json?oauth_token=' + users.token,
    function(data) {
        var js = JSON.parse(data).response.user;
        js.name = js.firstName + " " + js.lastName;
        users.stream.write(JSON.stringify(js) + "\n");

        if (friend.photo.indexOf("userpix") < 0)
        {
            return downloadNextUser(users);
        }

        // fetch photo
        wwwdude_client.get(friend.photo)
        .addListener('error',
        function(err) {
            console.log(err);
            downloadNextUser(users);
        })
        .addListener('http-error',
        function(data, resp) {
            console.log('HTTP Error for: ' + resp.host + ' code: ' + resp.statusCode);
            downloadNextUser(users);
        })
        .addListener('success',
        function(data, resp) {
            fs.writeFileSync('my/' + users.id + '/photos/' + friend.id + '.jpg', data, 'binary');
            downloadNextUser(users);
        }).send();
    });
}

console.log("http://localhost:3004/");
app.listen(3004);
