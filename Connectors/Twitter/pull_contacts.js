var http = require('http');
var consumerKey = process.argv[2];
var consumerSecret = process.argv[3];
var screen_name = process.argv[4];


var oauth_token_secret,
    oauth_token;

if (!consumerKey || !consumerSecret || !screen_name)
 {
    console.log("node client.js <consumerKey> <consumerSecret> <screen_name>");
    console.log("create one at http://dev.twitter.com/apps/new");
    process.exit(1);
}
var express = require('express'),
connect = require('connect');

var twitterClient = require('twitter-js')(consumerKey, consumerSecret, 'http://127.0.0.1:3003/'),
    app = express.createServer(
    connect.bodyDecoder(),
    connect.cookieDecoder(),
    connect.session({secret : "locker"})
    );
    
app.get('/',
    function(req, res) {
        twitterClient.getAccessToken(req, res,
        function(error, token) {
            if (error)
                console.log(JSON.stringify(error));
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            if (token != null) {
                console.log(JSON.stringify(token));
                oauth_token = token.oauth_token;
                oauth_token_secret = token.oauth_token_secret;
            }
            res.end();
            //    res.render('client.jade', {locals: {token: token}});
        });
    });
    

function get(host, url, secure, callback) {
    var fullUrl = 'http' + (secure? 's' : '') + '://' + host + url;
    var httpClient = http.createClient(secure? 443 : 80, host, secure);
    console.log('getting ' + fullUrl);
    var request = httpClient.request('GET', url, {
        host: host
    });
    request.end();
    console.log('called end');
    request.on('response',
        function(response) {
            if(response.statusCode != 200) {
                console.log('error! got a ' + response.statusCode + ' response code');
            }
            console.log('got response from ' + fullUrl);
            var data = '';
            response.on('data',
            function(chunk) {
                data += chunk;
            });
            response.on('end',
            function() {
                console.log('got ' + fullUrl);
                callback(data);
            });
        });
    console.log('added response listener');
}

var users = [];
var HOST = 'api.twitter.com';
var FRIENDS_URL = '/1/friends/ids.json?screen_name=' + screen_name + '&cursor=-1';
var MORE_INFO_BASE_URL = '/1/users/lookup.json?user_id=';


function getFriendsIDs(screenName, callback) {
    get(HOST, FRIENDS_URL, false, function(data) {
       callback(JSON.parse(data).ids);
    });
}

function getUserExtendedInfo(userID, callback) {
    var id_str = JSON.stringify(userID);
    id_str = id_str.substr(1, id_str.length - 2);
    console.log(id_str);
    twitterClient.apiCall('GET', '/users/lookup.json',
    {
        token: {
            oauth_token_secret: oauth_token_secret,
            oauth_token: oauth_token,
            user_id: id_str
        }
    },
    function(error, result) {
//        res.render('done.jade');
        if(error) console.log('error! ' + JSON.stringify(error));
        console.log(JSON.stringify(result));
    }
    );
    
  /*  get(HOST, MORE_INFO_BASE_URL + userID, false, function(data) {
        callback(JSON.parse(data));
    })*/
}


var numCompleted = 0;
function waitForAllCompleted(total) {
    if(numCompleted < total)
        setTimeout('waitForAllCompleted(' + total + ');', 50);
}


app.get('/friends',
function(req, res) {
    console.log('/friends');
    getFriendsIDs(screen_name, function(ids) {
        var j = 0;
        var ids_temp = [];
        while(j < ids.length) {
            for(var i = 0; i < 100 && j < ids.length; i++) {
                ids_temp.push(ids[i]);
                j++;
            }
            getUserExtendedInfo(ids_temp, function(usersInfo) {
                for(var k = 0; k < usersInfo.length; k++) {
                    users.push(usersInfo[k]);
                    numCompleted++;
                }
            });
        }
        waitForAllCompleted(ids.length);
        console.log('got all ' + ids.length + ' users');
//        for(var i = 0; i < users.length; i++) {
  //          console.log(JSON.stringify(users[i]));
    //    }
    });    
});

console.log('server running at http://localhost:3003/');
app.listen(3003);
