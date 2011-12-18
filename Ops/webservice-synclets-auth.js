var syncManager = require('lsyncmanager')
  , lconfig = require('lconfig')
  , logger = require('logger')
  , fs = require('fs')
  , path = require('path')
  , locker = require('../Common/node/locker')
  , request = require('request')
  , querystring = require('querystring')
  , host = lconfig.externalBase + "/"
  , config = {}
  , apiKeys = JSON.parse(fs.readFileSync(lconfig.lockerDir + "/Config/apikeys.json", 'utf-8'));

module.exports = function(locker) {
    var avail = syncManager.synclets().available;
    for(var i in avail) {
        var thisConfig = config[avail[i].provider] = require(path.join(lconfig.lockerDir, avail[i].srcdir, 'auth.js'));
        if(typeof thisConfig.handler == 'function') {
            addCustom(locker, avail[i].provider);
        } else if(thisConfig.handler && thisConfig.handler.oauth2) {
            addOAuth2(locker, avail[i].provider);
        }
    }
};

function addCustom(locker, provider) {
    locker.get('/auth/' + provider + '/auth', function(req, res) {
        config[provider].handler(host, apiKeys[provider], function(err, auth) {
            finishAuth(provider, auth, res);
        }, req, res);
    });
}

function addOAuth2(locker, provider) {
    locker.get('/auth/' + provider + '/auth', function(req, res) {
        handleOAuth2(provider, req.param('code'), res)
    });
}

function handleOAuth2(provider, code, res) {
    var options = config[provider];
    var method = options.handler.oauth2;
    var theseKeys = apiKeys[provider];
    var postData = {
        client_id: theseKeys.appKey,
        client_secret: theseKeys.appSecret,
        redirect_uri: host + 'auth/' + provider + '/auth',
        grant_type: options.grantType,
        code: code
    };
    var req = {method: method, url: options.endPoint};
    if(method == 'POST') {
        req.body = querystring.stringify(postData);
        req.headers = {'Content-Type' : 'application/x-www-form-urlencoded'};
    } else {
        req.url += '/access_token?' + querystring.stringify(postData);
    }
    request(req, function(err, resp, body) {
        try {
            body = JSON.parse(body);
        } catch(err) {
            body = querystring.parse(body);
        }
        var auth = {accessToken: body.access_token};
        if(method == 'POST') auth = {token: body, clientID: theseKeys.appKey, clientSecret: theseKeys.appSecret};
        if(typeof options.authComplete == 'function') {
            return options.authComplete(auth, function(err, auth) {
                finishAuth(provider, auth, res);
            });
        }
        finishAuth(provider, auth, res);
    });
}

function finishAuth(provider, auth, res) {
    var avail = syncManager.synclets().available;
    var newSynclet;
    for (var i = 0; i < avail.length; i++) {
        if (avail[i].provider == provider) newSynclet = avail[i];
    }
    newSynclet.auth = auth;
    var svcInfo = syncManager.install(newSynclet);
    syncManager.syncNow(svcInfo.id, function() {});
    res.end("<script type='text/javascript'>  window.opener.syncletInstalled('" + provider + "'); window.close(); </script>");
}