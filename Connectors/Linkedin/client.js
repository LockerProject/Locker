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
        connect.session({secret : 'locker'})
    ),
    http = require('http'),
    https = require('https'),
    oauthclient = require('oauth').OAuth,
		xml2js = require('xml2js'),
    wwwdude = require('wwwdude'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');

var lockerInfo;
var me;
var accessData;
var oAuth;

var wwwdude_client = wwwdude.createClient({
    encoding: 'binary'
});

function get(host, uri, callback) {
    var httpClient = http.createClient(443, host, true);
    var httpOpts = {
        'host' : host,
        port : 443,
        path: uri,
        method: 'GET'
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

app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    if (!accessData.accessToken) {
        res.end('<html>you need to <a href="oauthrequest">auth w/ Linkedin</a> still</html>');
		} else {
        res.end('<html>found a token, load <a href="profile">profile</a> or <a href="connections">connections</a></html>');
		}
});

app.get('/oauthrequest',
function(req, res) {
    if (!(accessData.appKey && accessData.appSecret)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html>Enter your personal Linkedin app info that will be used to sync your data' + 
                ' (create a new one <a href="https://www.linkedin.com/secure/developer">' + 
                'here</a> using the callback url of ' +
                me.uri+'auth) ' +
                '<form method="get" action="save">' +
                    'API Key: <input name="appKey"><br>' +
                    'Secret Key: <input name="appSecret"><br>' +
                    '<input type="submit" value="Save">' +
                '</form></html>');
    } else {
        sys.debug('redirecting to ' + me.uri + 'auth');
        oAuth = new oauthclient('https://api.linkedin.com/uas/oauth/requestToken',
                                'https://api.linkedin.com/uas/oauth/accessToken', 
                                accessData.appKey, accessData.appSecret, 
                                '1.0A', me.uri + 'auth', 'HMAC-SHA1');
        
        oAuth.getOAuthRequestToken(function(err, oAuthToken, oAuthTokenSecret, results) {
            if (err) {
              sys.debug(err);
            } else { 
              // store the tokens in the session
              req.session.oa = oAuth;
              req.session.oauth_token = oAuthToken;
              req.session.oauth_token_secret = oAuthTokenSecret;

              // redirect the user to authorize the token
              res.redirect('https://www.linkedin.com/uas/oauth/authorize?oauth_token=' + oAuthToken);
            }
          });
    }
});

app.get('/save',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    if (!req.param('appKey') || !req.param('appSecret')) {
        res.end('missing field(s)?');
        return;
    }
    accessData.appKey = req.param('appKey');
    accessData.appSecret = req.param('appSecret');
    lfs.writeObjectsToFile('access.json', [accessData]);
    res.end('<html>thanks, now we need to <a href="auth">auth that app to your account</a>.</html>');
});

app.get('/auth',
function(req, res) {
    req.session.oa.getOAuthAccessToken(
        req.session.oauth_token, 
        req.session.oauth_token_secret, 
        req.param('oauth_verifier'), 
        function(err, oAuthAccessToken, oAuthAccessTokenSecret, results2) {
          if (err) {
            sys.debug(err);
          } else {
            // store the access token in the session
            req.session.oauth_access_token = oAuthAccessToken;
            req.session.oauth_access_token_secret = oAuthAccessTokenSecret;
						accessData.accessToken = oAuthAccessToken;
						accessData.accessTokenSecret = oAuthAccessTokenSecret;
		        lfs.writeObjectsToFile('access.json', [accessData]);
		
						res.writeHead(200, {
				        'Content-Type': 'text/html'
				    });
		        res.end('<html>Did you see what I just did there?: ' + responseObject.access_token + ' Now you can load <a href="friends">friends</a> or <a href="checkins">checkins</a></html>');
          }
      });
});

app.get('/profile',
function(req, res) {
	oAuth.getProtectedResource(
		'http://api.linkedin.com/v1/people/~', 
		'GET', 
		accessData.accessToken, 
		accessData.accessTokenSecret, 
		function(err, data) {
			if (err) {
				sys.debug(err);
				return false;
			}
			
			var parser = new xml2js.Parser();
			
			parser.on('end', function(result) {
				me.user_info = result.person;
        lfs.syncMeData(me);
        res.write('For user ' + me.user_info.first-name + ': <br>');
			});
			
			parser.on('error', function(err) {
			  sys.debug(err);
			});
			
			parser.parseString(data);
  });
});

app.get('/getprofile',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    fs.readFile('me.json', 'binary', function(err, file) {  
        if (err) {  
            res.end();  
            return;  
        }  
        res.write(file, 'binary');  
        res.end();
    });
});

/*

app.get('/connections',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });		

    get('api.foursquare.com', '/v2/users/self/friends.json?oauth_token=' + accessData.accessToken, function(data) {
        var friends = JSON.parse(data).response.friends.items;
        var queue = [];
        var users = {
            'id': userID,
            'queue': queue,
            'token': accessData.accessToken
        };
        for (var i = 0; i < friends.length; i++) {
            res.write(friends[i].firstName + ' ' + friends[i].lastName + '<br>');
            queue.push(friends[i]);
        }
        locker.at('/friends', 3600);
        res.end();
        downloadNextUser(users);
    });
});

app.get('/getconnections',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    fs.readFile('friends.json', 'binary', function(err, file) {  
        if(err) {  
            res.end();  
            return;  
        }  
        res.write(file, 'binary');  
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
            lfs.appendObjectsToFile('places.json', newCheckins);
            locker.at('/checkins', 600);
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.end();
        });
    });
})

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
        js.name = js.firstName + ' ' + js.lastName;        
        lfs.appendObjectsToFile('friends.json', [js]);
        if (friend.photo.indexOf('userpix') < 0)
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
*/

// Process the startup JSON object
process.stdin.resume();
process.stdin.on('data', function(data) {
    lockerInfo = JSON.parse(data);
    if (!lockerInfo || !lockerInfo['workingDirectory']) {
        process.stderr.write('Was not passed valid startup information.'+data+'\n');
        process.exit(1);
    }
    locker.initClient(lockerInfo);
    process.chdir(lockerInfo.workingDirectory);
    me = lfs.loadMeData();
    try {
        accessData = JSON.parse(fs.readFileSync('access.json', 'utf8'));
    } catch (E) {
        accessData = {};
    }
    app.listen(lockerInfo.port, 'localhost', function() {
        process.stdout.write(data);
    });
});
