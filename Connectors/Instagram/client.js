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
    request = require('request'),
    oauthclient = require('oauth').OAuth2,
    locker = require('locker'),
    lfs = require('lfs');

var lockerInfo;
var accessData;
var externalUrl;
var oAuth;
var state;

function setupOAuthClient(clientId, clientSecret) {
    oAuth = new oauthclient(clientId, clientSecret, 
                            'https://api.instagram.com',
                            '/oauth/authorize',
                            '/oauth/access_token');
}

app.get('/',
function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    if (!accessData.accessToken) {
        res.end('<html>you need to <a href="oauthrequest">auth w/ Instagram</a> still</html>');
    } else {
        res.end('<html>found a token, load <a href="profile">profile</a> or <a href="connections">photos</a></html>');
    }
});

app.get('/oauthrequest',
function(req, res) {
    if (!(accessData.clientId && accessData.clientSecret)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html>Enter your personal Instagram app info that will be used to sync your data' + 
                ' (create a new one <a href="http://www.instagr.am/developer">' + 
                'here</a> using the callback url of ' +
                externalUrl+'auth) ' +
                '<form method="get" action="save">' +
                    'Client ID: <input name="clientId"><br>' +
                    'Client Secret: <input name="clientSecret"><br>' +
                    '<input type="submit" value="Save">' +
                '</form></html>');
    } else {
        var params = { response_type: 'code', redirect_uri: externalUrl + 'auth' };                          
        accessData = JSON.parse(fs.readFileSync('access.json', 'utf8'));
        setupOAuthClient(accessData.clientId, accessData.clientSecret);
        console.error('redirecting to ' + oAuth.getAuthorizeUrl(params));
        res.redirect(oAuth.getAuthorizeUrl(params));
        res.end();
    }
});

app.get('/save',
function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    if (!req.param('clientId') || !req.param('clientSecret')) {
        res.end('missing field(s)?');
        return;
    }
    accessData.clientId = req.param('clientId');
    accessData.clientSecret = req.param('clientSecret');
    lfs.writeObjectsToFile('access.json', [accessData]);
    res.end('<html>thanks, now we need to <a href="oauthrequest">auth that app to your account</a>.</html>');
});

app.get('/auth',
function(req, res) {
    accessData = JSON.parse(fs.readFileSync('access.json', 'utf8'));
    setupOAuthClient(accessData.clientId, accessData.clientSecret);
    request({uri: 'https://api.instagram.com/oauth/access_token',
             method: 'POST',
             body: querystring.stringify({code: req.param('code'), 
                                          grant_type: 'authorization_code',
                                          redirect_uri: externalUrl + 'auth',
                                          client_id: accessData.clientId,
                                          client_secret: accessData.clientSecret })}, 
        function(err, resp, body) {
            if (err) {
                console.error(err);
            } else {
                accessData.accessToken = JSON.parse(body).access_token;
                lfs.writeObjectsToFile('access.json', [accessData]);
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('<html>Did you see what I just did there? Now you can load your <a href="profile">profile</a> or <a href="photos">photos</a></html>');
            }
        });
});

app.get('/profile', function(req, res) {
    oAuth.getProtectedResource('https://api.instagram.com/v1/users/self', accessData.accessToken, function(err, data) {
        if (err) {
            console.error(err);
            return false;
        }
        lfs.writeObjectToFile('profile.json', data);
        res.end('User profile: ' + JSON.stringify(data) + ': <br>');
    });
});

app.get('/getprofile',
function(req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    fs.readFile('profile.json', 'utf8', function(err, file) {  
        if (err) {
            res.end();
            return;
        }
        res.write(file.toString());
        res.end();
    });
});

app.get('/photos',
function(req, res) {
    try {
        fs.mkdirSync('low_resolution', 755);
        fs.mkdirSync('thumbnail', 755);
        fs.mkdirSync('standard', 755);
    } catch(err) {
        console.error('could not create directories to store photos');
        return false;
    }
    getPhotos(state.newest);
    lfs.writeObjectToFile('state.json', state);
    res.end(JSON.stringify(state));
});

app.get('/getphotos',
function(req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    fs.readFile('connections.json', 'utf8', function(err, file) {  
        if(err) {
            res.end();
            return;
        }
        res.write(file.toString());
        res.end();
    });
});

//get a page of photos and recurse until all pages are completed
function getPhotos(newest) {
    if(!newest) {
        newest = 0;
    
    oAuth.getProtectedResource('https://api.instagram.com/v1/users/self/feed?max_id=' + newest,
        accessData.accessToken, 
        function(err, data) {
            if (err) {
                console.error(err);
                return false;
            }
            var json = JSON.parse(data);
            
            if(!json || !json.data) {
                console.error(data);
                res.end();
            }
            
            lfs.appendObjectsToFile('photos.json', json.data);
            
            var curl = function(photos) {
                if (!photos || photos.length < 1) {
                    callback();
                    return;
                }
                var photo = photos.pop();
                var id = photo.id;
                lfs.saveUrl(photo.images.low_resolution.url, 'low_resolution/' + id + '.jpg', function(err) {
                    if (err)
                        console.error(err);
                    lfs.saveUrl(photo.images.thumbnail.url, 'thumbnail/' + id + '.jpg', function(err) {
                        if (err)
                            console.error(err);
                        lfs.saveUrl(photo.images.standard.url, 'standard/' + id + '.jpg', function(err) {
                            if (err)
                                console.error(err);
                            console.error('got Instagram photo ' + id);
                            locker.event('photo/instagram', {"_id":id});
                        });
                    });
                });
            };
            
            for (var i=0, len=json.data.length; i<len; ++i) {
                curl(json.data);
            }
            
            curl(json.data);
    });
}

// Process the startup JSON object
process.stdin.resume();
process.stdin.on('data', function(data) {
    lockerInfo = JSON.parse(data);
    if (!lockerInfo || !lockerInfo.workingDirectory) {
        process.stderr.write('Was not passed valid startup information.'+data+'\n');
        process.exit(1);
    }
    externalUrl = lockerInfo.externalBase;
    locker.initClient(lockerInfo);
    process.chdir(lockerInfo.workingDirectory);
    try {
        accessData = JSON.parse(fs.readFileSync('access.json', 'utf8'));
        setupOAuthClient(accessData.clientId, accessData.clientSecret);
    } catch (E) {
        accessData = {};
    }
    lfs.readObjectFromFile('state.json', function(newestState) {
        state = newestState;
    });
    app.listen(lockerInfo.port, 'localhost', function() {
        process.stdout.write(data);
    });
});
