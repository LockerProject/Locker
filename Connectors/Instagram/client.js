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
    oauthclient = require('oauth').OAuth2,
    xml2js = require('xml2js'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');

var lockerInfo;
var me;
var accessData;
var tokenData = {};
var oAuth;

var html = require('../../Common/node/html.js');
var format = function(content) {
    return html.formatHTML("Instagram", content, ["#3B5998", "white"]); // These colors can be customized later...
};

function setupOAuthClient(clientId, clientSecret) {
  oAuth = new oauthclient(clientId, clientSecret, 
													'https://api.instagram.com',
                          '/oauth/authorize',
													'/oauth/access_token');
}

app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    if (!accessData.tokenData || !accessData.tokenData.accessToken) {
        res.end(format('you need to <a href="oauthrequest">auth w/ Instagram</a> still'));
    } else {
        res.end(format('found a token, load <a href="profile">profile</a> or <a href="connections">photos</a>'));
    }
});

app.get('/oauthrequest',
function(req, res) {
    if (!(accessData.clientId && accessData.clientSecret)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(format('Enter your personal Instagram app info that will be used to sync your data' + 
                ' (create a new one <a href="http://www.instagr.am/developer">' + 
                'here</a> using the callback url of ' +
                me.uri+'auth) ' +
                '<form method="get" action="save">' +
                    'Client ID: <input name="clientId"><br>' +
                    'Client Secret: <input name="clientSecret"><br>' +
                    '<input type="submit" value="Save">' +
                '</form>'));
    } else {
				var params = { response_type: 'code',
											 redirect_uri: me.uri + 'auth' };
							
				accessData = JSON.parse(fs.readFileSync('access.json', 'utf8'));
        setupOAuthClient(accessData.clientId, accessData.clientSecret);
				
        console.log('redirecting to ' + oAuth.getAuthorizeUrl(params));
        res.redirect(oAuth.getAuthorizeUrl(params));
        res.end();
    }
});

app.get('/save',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    if (!req.param('clientId') || !req.param('clientSecret')) {
        res.end(format('missing field(s)?'));
        return;
    }
    accessData.clientId = req.param('clientId');
    accessData.clientSecret = req.param('clientSecret');
    lfs.writeObjectsToFile('access.json', [accessData]);
    res.end(format('thanks, now we need to <a href="oauthrequest">auth that app to your account</a>.'));
});

app.get('/auth',
function(req, res) {
    console.log('calling /auth');

    accessData = JSON.parse(fs.readFileSync('access.json', 'utf8'));
console.log(accessData);
    setupOAuthClient(accessData.clientId, accessData.clientSecret);

    oAuth.getOAuthAccessToken(req.param('code'), {}, 
        function(err, oAuthAccessToken, oAuthRefreshToken) {
          if (err) {
            console.log(err);
          } else {
            tokenData = {};
            tokenData.accessToken = oAuthAccessToken;
            tokenData.refreshToken = oAuthRefreshToken;
            accessData.tokenData = tokenData;
            lfs.writeObjectsToFile('access.json', [accessData]);
    
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.end(format('Did you see what I just did there? Now you can load your <a href="profile">profile</a> or <a href="photos">photos</a>'));
          }
      });
});

app.get('/profile',
function(req, res) {
  oAuth.getProtectedResource(
    'http://api.linkedin.com/v1/people/~',
    accessData.tokenData.accessToken, 
    function(err, data) {
      if (err) {
        console.log(err);
        return false;
      }
      
      var parser = new xml2js.Parser();
      var userProfile;
      parser.on('end', function(result) {
        console.log(result);
        me.user_info = result;
        lfs.syncMeData(me);
        userProfile = 'User profile: ' + JSON.stringify(result) + ': <br>';
      });
      
      parser.on('error', function(err) {
        console.log(err);
      });
      
      res.end(format(userProfile + parser.parseString(data)));
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

app.get('/photos',
function(req, res) {
    oAuth.getProtectedResource(
      'http://api.linkedin.com/v1/people/~/connections', 
      'GET', 
      accessData.tokenData.accessToken, 
      accessData.tokenData.accessTokenSecret, 
      function(err, data) {
        if (err) {
          console.log(err);
          return false;
        }

        var parser = new xml2js.Parser();
        var connections;
        parser.on('end', function(result) {
          console.log(result);
          lfs.writeObjectsToFile('connections.json', [result]);
          connections = 'Connections: ' + JSON.stringify(result) + ': <br>';
        });

        parser.on('error', function(err) {
          console.log(err);
        });

        res.end(format(connections + parser.parseString(data)));
    });
});

app.get('/getphotos',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    fs.readFile('connections.json', 'binary', function(err, file) {  
        if(err) {  
            res.end();  
            return;  
        }  
        res.write(file, 'binary');  
        res.end();
    });
});

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
        setupOAuthClient(accessData.clientId, accessData.clientSecret);
    } catch (E) {
        accessData = {};
    }
    app.listen(lockerInfo.port, 'localhost', function() {
        process.stdout.write(data);
    });
});
