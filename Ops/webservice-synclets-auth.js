var syncManager = require('lsyncmanager')
  , host = "http://localhost:8042/"
  , fs = require('fs')
  , locker = require('../Common/node/locker')
  , request = require('request')
  , lconfig = require('../Common/node/lconfig')
  , apiKeys = JSON.parse(fs.readFileSync(lconfig.lockerDir + "/" + lconfig.me + "/apikeys.json", 'ascii'))
  , foursquare = {"provider" : "foursquare",
     "accessTokenResponse" : "json",
     "endPoint" : "https://foursquare.com/oauth2/",
     "redirectURI" : "auth/foursquare/auth",
     "grantType" : "authorization_code"}
  ;


module.exports = function(locker) {
    locker.get('/auth/foursquare/auth', function(req, res) {
        handleAuth(req.param('code'), foursquare, res);
    });
};

function handleAuth (code, options, res) {
    var newUrl = options.endPoint + '/access_token' +
                    '?client_id=' + apiKeys[options.provider].appKey +
                    '&client_secret=' + apiKeys[options.provider].appSecret +
                    '&grant_type=' + options.grantType +
                    '&redirect_uri=' + host + options.redirectURI + 'auth/' +
                    '&code=' + code;
    request.get({url:newUrl}, function(err, resp, body) {
        var avail = syncManager.synclets().available;
        var newSynclet;
        for (var i = 0; i < avail.length; i++) {
            if (avail[i].provider == options.provider) newSynclet = avail[i];
        }
        newSynclet.auth = {};
        if (options.accessTokenResponse == 'json') {
            newSynclet.auth.accessToken = JSON.parse(body).access_token;
        } else {
            newSynclet.auth.accessToken = querystring.parse(body).access_token;
        }
        syncManager.install(newSynclet);
        res.end("<script type='text/javascript'>if (window.opener) { window.opener.location.reload(true); } window.close(); </script>");
    });
}