var syncManager = require('lsyncmanager')
  , host = "http://localhost:8042/"
  , fs = require('fs')
  , locker = require('../Common/node/locker')
  , request = require('request')
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
  , apiKeys = {}
  ;

try{
    apiKeys = JSON.parse(fs.readFileSync(lconfig.lockerDir + "/" + lconfig.me + "/apikeys.json", 'ascii'))    
}catch(e){}

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
        handleGoogleContacts(req, res);
    });
    locker.get('/auth/twitter/auth', function(req, res) {
        handleTwitter(req, res);
    });
};

function handleOAuth2 (code, options, res) {
    console.dir(options.redirectURI);
    var newUrl = options.endPoint + '/access_token' +
                    '?client_id=' + apiKeys[options.provider].appKey +
                    '&client_secret=' + apiKeys[options.provider].appSecret +
                    '&grant_type=' + options.grantType +
                    '&redirect_uri=' + host + options.redirectURI +
                    '&code=' + code;
    request.get({url:newUrl}, function(err, resp, body) {
        auth = {};
        console.dir(body);
        if (options.accessTokenResponse == 'json') {
            auth.accessToken = JSON.parse(body).access_token;
        } else {
            auth.accessToken = querystring.parse(body).access_token;
        }
        console.dir(auth);
        if (options.provider === 'github') {
            request.get({url:"https://github.com/api/v2/json/user/show?access_token=" + auth.accessToken}, function(err, resp, body) {
                var resp = JSON.parse(body);
                console.dir(resp);
                auth.username = resp.user.login;
                installSynclet(options.provider, auth);
            });
        } else {
            installSynclet(options.provider, auth);
        }
        res.end("<script type='text/javascript'>if (window.opener) { window.opener.location.reload(true); } window.close(); </script>");
    });
}

function handleGoogleContacts (req, res) {
    require('gdata-js')(apiKeys["gcontacts"].appKey, apiKeys["gcontacts"].appSecret, host + "/auth/gcontacts/auth")
        .getAccessToken(scope, req, res, function(err, tkn) {
            var auth = {};
            auth.token = tkn;
            installSynclet("gcontacts", auth);
            res.end("<script type='text/javascript'>if (window.opener) { window.opener.location.reload(true); } window.close(); </script>");
        });
}

function handleTwitter (req, res) {
    // twitter's annoying.
    // for the current ghetto flow, we're only allowing 1 twitter synclet to be installed
    // unless i come up with a better solution
    //
    var installed = syncManager.synclets().installed;
    for (var i in installed) {
        if (i == 'twitter') {
            return res.end('twitter already installed!!!');
        }
    }
    require('../Connectors/twitter/twitter_client')(apiKeys.twitter.appKey, apiKeys.twitter.appSecret, host + "auth/twitter/auth")
        .getAccessToken(req, res, function(err, newToken) {
            var auth = {};
            auth.consumerKey = apiKeys.twitter.appKey;
            auth.consumerSecret = apiKeys.twitter.appSecret;
            auth.token = newToken;
            installSynclet("twitter", auth);
            res.end("<script type='text/javascript'>if (window.opener) { window.opener.location.reload(true); } window.close(); </script>");
        });
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