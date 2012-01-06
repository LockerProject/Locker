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
    app = express.createServer(
        connect.bodyParser(),
        connect.cookieParser(),
        connect.session({secret : 'locker'})
    ),
    oauthclient = require('oauth').OAuth,
    xml2js = require('xml2js'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');

var lockerInfo;
var me;
var externalBase;
var accessData;
var tokenData = {};
var oAuth;

function setupOAuthClient(appKey, appSecret, redirectUri) {
  oAuth = new oauthclient('https://api.linkedin.com/uas/oauth/requestToken',
                          'https://api.linkedin.com/uas/oauth/accessToken', 
                          appKey, appSecret, 
                          '1.0', redirectUri, 'HMAC-SHA1');
}

app.get('/',
function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    if (!accessData.tokenData || !accessData.tokenData.accessToken) {
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
                ' (create a new one <a href="https://www.linkedin.com/secure/developer" target="_blank">' + 
                'here</a> using the callback url of ' +
                externalBase+'auth) ' +
                '<form method="get" action="save">' +
                    'API Key: <input name="appKey"><br>' +
                    'Secret Key: <input name="appSecret"><br>' +
                    '<input type="submit" value="Save">' +
                '</form></html>');
    } else {
        console.error('redirecting to ' + externalBase + 'auth');
        
        accessData = JSON.parse(fs.readFileSync('access.json', 'utf8'));
        setupOAuthClient(accessData.appKey, accessData.appSecret, externalBase + 'auth');
        
        oAuth.getOAuthRequestToken(function(err, oAuthToken, oAuthTokenSecret, results) {
            if (err) {
                console.error(err);
            } else {
                tokenData.oAuthToken = oAuthToken;
                tokenData.oAuthTokenSecret = oAuthTokenSecret;
                accessData.tokenData = tokenData;
                lfs.writeObjectsToFile('access.json', [accessData]);
                
                // redirect the user to authorize the token
                console.error('redirecting to ' + 'https://www.linkedin.com/uas/oauth/authorize?oauth_token=' + oAuthToken);
                res.redirect('https://www.linkedin.com/uas/oauth/authorize?oauth_token=' + oAuthToken);
                res.end();
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
    res.end('<html>thanks, now we need to <a href="oauthrequest">auth that app to your account</a>.</html>');
});

app.get('/auth',
function(req, res) {
    console.error('calling /auth');
    accessData = JSON.parse(fs.readFileSync('access.json', 'utf8'));
    setupOAuthClient(accessData.appKey, accessData.appSecret, externalBase + 'auth');
    
    oAuth.getOAuthAccessToken(accessData.tokenData.oAuthToken, accessData.tokenData.oAuthTokenSecret, 
                                req.param('oauth_verifier'), 
    function(err, oAuthAccessToken, oAuthAccessTokenSecret, results) {
        if (err) {
            console.error(err);
        } else {
            tokenData = {};
            tokenData.accessToken = oAuthAccessToken;
            tokenData.accessTokenSecret = oAuthAccessTokenSecret;
            accessData.tokenData = tokenData;
            lfs.writeObjectsToFile('access.json', [accessData]);
            
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end('<html>Did you see what I just did there? Now you can load your <a href="profile">profile</a> or <a href="connections">connections</a></html>');
        }
    });
});

app.get('/profile',
function(req, res) {
    oAuth.getProtectedResource('http://api.linkedin.com/v1/people/~', 'GET', 
        accessData.tokenData.accessToken, accessData.tokenData.accessTokenSecret, 
    function(err, data) {
        if (err) {
            console.error(err);
            return false;
        }
        
        var parser = new xml2js.Parser();
        
        parser.on('end', function(result) {
            me.user_info = result;
            lfs.syncMeData(me);
            res.write('User profile: ' + JSON.stringify(result) + ': <br>');
        });
        
        parser.on('error', function(err) {
            console.error(err);
        });
        
        res.end(parser.parseString(data));
    });
});

app.get('/getprofile',
function(req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    fs.readFile('me.json', 'binary', function(err, file) {
        if (err) {
            res.end();
            return; 
        }
        res.write(file, 'binary');
        res.end();
    });
});

app.get('/connections',
function(req, res) {
    oAuth.getProtectedResource('http://api.linkedin.com/v1/people/~/connections', 'GET', 
        accessData.tokenData.accessToken, accessData.tokenData.accessTokenSecret, 
        function(err, data) {
            if (err) {
                console.error(err);
                return false;
            }
            
            var parser = new xml2js.Parser();
            
            parser.on('end', function(result) {
                lfs.writeObjectsToFile('connections.json', [result]);
                res.write('Connections: ' + JSON.stringify(result) + ': <br>');
            });
            
            parser.on('error', function(err) {
                console.error(err);
            });
            
            res.end(parser.parseString(data));
    });
});

app.get('/getconnections',
function(req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});
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
    externalBase = lockerInfo.externalBase;
    locker.initClient(lockerInfo);
    process.chdir(lockerInfo.workingDirectory);
    me = lfs.loadMeData();
    try {
        accessData = JSON.parse(fs.readFileSync('access.json', 'utf8'));
        setupOAuthClient(accessData.appKey, accessData.appSecret, externalBase + 'auth');
    } catch (E) {
        accessData = {};
    }
    app.listen(lockerInfo.port, 'localhost', function() {
        process.stdout.write(data);
    });
});
