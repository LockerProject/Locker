var syncManager = require('lsyncmanager')
  , lconfig = require('lconfig')
  , fs = require('fs')
  , locker = require('../Common/node/locker')
  , request = require('request')
  , https = require('https')
  , host = ''
  , querystring = require('querystring')
  , lconfig = require('../Common/node/lconfig')
  , foursquare = {"provider" : "foursquare",
      "accessTokenResponse" : "json",
      "endPoint" : "https://foursquare.com/oauth2/",
      "redirectURI" : "auth/foursquare/auth",
      "grantType" : "authorization_code"}
  , facebook = {"provider" : "facebook",
      "endPoint" : "https://graph.facebook.com/oauth",
      "redirectURI" : "auth/facebook/auth",
      "grantType" : ''}
  , github = {"provider" : "github",
      "endPoint" : "https://github.com/login/oauth",
      "redirectURI" : "auth/github/auth"}
  , gcontacts = {"provider" : "gcontacts",
      "endPoint" : "https://accounts.google.com/o/oauth2/token",
      "redirectURI" : "auth/gcontacts/auth",
      "grantType" : "authorization_code"}
  , gplus = {"provider" : "gplus",
      "endPoint" : "https://accounts.google.com/o/oauth2/token",
      "redirectURI" : "auth/gplus/auth",
      "grantType" : "authorization_code"}
  , glatitude = {"provider" : "glatitude",
      "endPoint" : "https://accounts.google.com/o/oauth2/token",
      "redirectURI" : "auth/glatitude/auth",
      "grantType" : "authorization_code"}
  , apiKeys = {}
  ;

try{
    apiKeys = JSON.parse(fs.readFileSync(lconfig.lockerDir + "/Config/apikeys.json", 'utf-8'))
}catch(e){}

if (lconfig.externalSecure) {
    host = "https://";
} else {
    host = "http://";
}
host += lconfig.externalHost + ":" + lconfig.externalPort + "/";

module.exports = function(locker) {
    locker.get('/auth/foursquare/auth', function(req, res) {
        handleOAuth2(req.param('code'), foursquare, res);
    });
    locker.get('/auth/facebook/auth', function(req, res) {
        handleOAuth2(req.param('code'), facebook, res);
    });
    locker.get('/auth/github/auth', function(req, res) {
        handleOAuth2(req.param('code'), github, res);
    });
    locker.get('/auth/gcontacts/auth', function(req, res) {
        handleOAuth2Post(req.param('code'), gcontacts, res);
    });
    locker.get('/auth/gplus/auth', function(req, res) {
        handleOAuth2Post(req.param('code'), gplus, res);
    });
    locker.get('/auth/glatitude/auth', function(req, res) {
        handleOAuth2Post(req.param('code'), glatitude, res);
    });
    locker.get('/auth/twitter/auth', function(req, res) {
        handleTwitter(req, res);
    });
    locker.get('/auth/tumblr/auth', function(req, res) {
        handleTumblr(req, res);
    });
    locker.get('/auth/flickr/auth', function(req, res) {
        handleFlickr(req, res);
    });
};

function handleOAuth2 (code, options, res) {
    try {
        var newUrl = options.endPoint + '/access_token' +
                        '?client_id=' + apiKeys[options.provider].appKey +
                        '&client_secret=' + apiKeys[options.provider].appSecret +
                        '&grant_type=' + options.grantType +
                        '&redirect_uri=' + host + options.redirectURI +
                        '&code=' + code;
        request.get({url:newUrl}, function(err, resp, body) {
            auth = {};
            if (options.accessTokenResponse == 'json') {
                auth.accessToken = JSON.parse(body).access_token;
            } else {
                auth.accessToken = querystring.parse(body).access_token;
            }
            if (options.provider === 'github') {
                request.get({url:"https://github.com/api/v2/json/user/show?access_token=" + auth.accessToken}, function(err, resp, body) {
                    try {
                        var resp = JSON.parse(body);
                        auth.username = resp.user.login;
                        installSynclet(options.provider, auth);
                        res.end("<script type='text/javascript'> window.close(); </script>");
                    } catch (e) {
                        console.error('Failed to auth github - ' + body);
                    }
                });
            } else if (auth.accessToken) {
                installSynclet(options.provider, auth);
                res.end("<script type='text/javascript'> window.close(); </script>");
            } else {
                res.end(body);
            }
        });
    } catch (E) {
        res.end('failed to authenticate against service - ' + E);
    }
}

function handleOAuth2Post (code, options, res) {
    try {
        var postData = {grant_type:options.grantType,
                  code:code,
                  client_id:apiKeys[options.provider].appKey,
                  client_secret:apiKeys[options.provider].appSecret,
                  redirect_uri:host + options.redirectURI};
        request({method: 'POST', uri :options.endPoint, body: querystring.stringify(postData), headers : {'Content-Type' : 'application/x-www-form-urlencoded'}}, function(err, resp, body) {
            auth = {};
            auth.clientID = apiKeys[options.provider].appKey;
            auth.clientSecret = apiKeys[options.provider].appSecret;
            auth.token = JSON.parse(body);
            installSynclet(options.provider, auth);
            res.end("<script type='text/javascript'>if (window.opener) { window.opener.location.reload(true); } window.close(); </script>");
        });

    } catch (E) {
        res.end('failed to authenticate against service - ' + E);
    }
}

function handleTwitter (req, res) {
    try {
        require('../Connectors/Twitter/twitter_client')(apiKeys.twitter.appKey, apiKeys.twitter.appSecret, host + "auth/twitter/auth")
            .getAccessToken(req, res, function(err, newToken) {
                var auth = {};
                auth.consumerKey = apiKeys.twitter.appKey;
                auth.consumerSecret = apiKeys.twitter.appSecret;
                auth.token = newToken;
                installSynclet("twitter", auth);
                res.end("<script type='text/javascript'> window.close(); </script>");
            });
    } catch (E) {
        res.end('failed to authenticate against service - ' + E);
    }
}

function handleTumblr (req, res) {
    try {
        require('../Connectors/Tumblr/tumblr_client')(apiKeys.tumblr.appKey, apiKeys.tumblr.appSecret, host + "auth/tumblr/auth")
            .getAccessToken(req, res, function(err, newToken) {
                var auth = {};
                auth.consumerKey = apiKeys.tumblr.appKey;
                auth.consumerSecret = apiKeys.tumblr.appSecret;
                auth.token = newToken;
                installSynclet("tumblr", auth);
                res.end("<script type='text/javascript'> window.close(); </script>");
            });
    } catch (E) {
        res.end('failed to authenticate against service - ' + E);
    }
}

function handleFlickr (req, res) {
    var client = require('flickr-js')(apiKeys.flickr.appKey, apiKeys.flickr.appSecret);
    var frob = req.param('frob');
    if(!frob) { //starting out
        res.redirect(client.getAuthURL('read'));
    } else { //finishing
        client.getTokenFromFrob(frob, function(err, auth) {
            auth.apiKey = apiKeys.flickr.appKey;
            auth.apiSecret = apiKeys.flickr.appSecret;
            auth.token = auth.token;
            installSynclet("flickr", auth);
            res.end("<script type='text/javascript'> window.close(); </script>");
        });
    }
}


function installSynclet (provider, auth) {
    var avail = syncManager.synclets().available;
    var newSynclet;
    for (var i = 0; i < avail.length; i++) {
        if (avail[i].provider == provider) newSynclet = avail[i];
    }
    newSynclet.auth = auth;
    var svcInfo = syncManager.install(newSynclet);
    syncManager.syncNow(svcInfo.id, function() {});
}
