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
    oauthclient = require('../../Common/node/node-oauth/index.js').OAuth2,
    xml2js = require('xml2js'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');

var lockerInfo;
var me;
var accessData;
var tokenData = {};
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
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    if (!accessData.tokenData || !accessData.tokenData.accessToken) {
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
                me.uri+'auth) ' +
                '<form method="get" action="save">' +
                    'Client ID: <input name="clientId"><br>' +
                    'Client Secret: <input name="clientSecret"><br>' +
                    '<input type="submit" value="Save">' +
                '</form></html>');
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
    console.log('calling /auth');

    accessData = JSON.parse(fs.readFileSync('access.json', 'utf8'));
    setupOAuthClient(accessData.clientId, accessData.clientSecret);
		console.log(accessData);
    oAuth.getOAuthAccessToken(req.param('code'), 
															{ grant_type: 'authorization_code', 
		    											  redirect_uri: me.uri + 'auth' }, 
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
            res.end('<html>Did you see what I just did there? Now you can load your <a href="profile">profile</a> or <a href="photos">photos</a></html>');
          }
      });
});

app.get('/profile',
function(req, res) {
  oAuth.getProtectedResource(
    'https://api.instagram.com/v1/users/self',
    accessData.tokenData.accessToken, 
    function(err, data) {
      if (err) {
        console.log(err);
        return false;
      }
  
			me.user_info = data;
			lfs.syncMeData(me);
			res.end('User profile: ' + JSON.stringify(data) + ': <br>');
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
	
		try {
	      fs.mkdirSync('low_resolution', 0755);
	      fs.mkdirSync('thumbnail', 0755);
				fs.mkdirSync('standard', 0755);
	  } catch(err) {
	  	console.log('could not create directories to store photos');
			return false;
		}
	
		getPhotos(state.newest);
    lfs.writeObjectToFile('state.json', state);
    res.end(JSON.stringify(state));
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

//get a page of photos and recurse until all pages are completed
function getPhotos(newest) {

    if(!newest) {
			newest = 0;
		}
		
		oAuth.getProtectedResource(
      'https://api.instagram.com/v1/users/self/feed?max_id=' + newest,
      accessData.tokenData.accessToken, 
      function(err, data) {
        if (err) {
          console.log(err);
          return false;
        }
		
				var json = JSON.parse(data);
		
				if(!json || !json.data) {
					console.log(data);
					res.end();
				}

				lfs.appendObjectsToFile('photos.json', json.data);

				for (var i=0, var length=json.data.length; i<length; ++i) {

					function curl(photos, callback) {
						if (!photos || photos.length < 1) {
							return callback();
						}
						var photo = photos.pop();
						var id = photo.id;
						lfs.curlFile(photo.images.low_resolution.url, 'low_resolution/' + id + '.jpg', function(err) {
							if (err) {
								sys.debug(err);
							}
							
							lfs.curlFile(photo.images.thumbnail.url, 'thumbnail/' + id + '.jpg', function(err) {
								if (err) {
									sys.debug(err);
								}
								
								lfs.curlFile(photo.images.standard.url, 'standard/' + id + '.jpg', function(err) {
									if (err) {
										sys.debug(err);
									}
									
									console.log('got Instagram photo ' + id);
									locker.event('photo/instagram', {"_id":id});
								});
							});
						});
					}
				}
				
				curl(json.data, function() {});
			});
}

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
		lfs.readObjectFromFile('state.json', function(newestState) {
        state = newestState;
		}
    app.listen(lockerInfo.port, 'localhost', function() {
        process.stdout.write(data);
    });
});
