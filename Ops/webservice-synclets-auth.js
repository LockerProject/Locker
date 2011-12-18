var syncManager = require('lsyncmanager')
  , lconfig = require('lconfig')
  , logger = require('logger')
  , fs = require('fs')
  , path = require('path')
  , locker = require('../Common/node/locker')
  , request = require('request')
  , querystring = require('querystring');

var apiKeys = {}
  , config = {};

try {
    apiKeys = JSON.parse(fs.readFileSync(lconfig.lockerDir + "/Config/apikeys.json", 'utf-8'))
} catch(e) { }

var host = lconfig.externalBase + "/";

module.exports = function(locker) {
    var avail = syncManager.synclets().available;
    for(var i in avail) {
        var thisConfig = config[avail[i].provider] = require(path.join(lconfig.lockerDir, avail[i].srcdir, 'auth.js'));
        if(typeof thisConfig.handler == 'function') {
            addCustomHandler(locker, avail[i].provider);
        } else if(typeof thisConfig.handler == 'object' && typeof thisConfig.handler.oauth2 == 'string') {
            addOauth2Handler(locker, avail[i].provider);
        }
    }
};

function addOauth2Handler(locker, provider) {
    locker.get('/auth/' + provider + '/auth', function(req, res) {
        handleOAuth2(provider, req.param('code'), res)
    });
}

function addCustomHandler(locker, provider) {
    locker.get('/auth/' + provider + '/auth', function(req, res) {
        config[provider].handler(host, apiKeys[provider], function(err, auth) {
            finishAuth(provider, auth, res);
        }, req, res);
    });
}

function handleOAuth2(method, provider, code, res) {
    var method = config.handler.oauth2;
    var options = config[provider];
    try {
        var postData = {
            client_id: apiKeys[provider].appKey,
            client_secret: apiKeys[provider].appSecret,
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
        var callback = method == 'GET'? finishOAuth2Get : finishOAuth2Post;
        request(req, function(err, resp, body) {
            try {
                body = JSON.parse(body);
            } catch(err) {
                body = querystring.parse(body);
            }
            callback(provider, body, function(auth) {
                finishAuth(provider, auth, res);
            });
        });
    } catch (E) {
        res.end('failed to authenticate against provider - ' + E);
    }
}

function finishOAuth2Get (provider, body, callback) {
    var auth = {accessToken: body.access_token};
    if(typeof config[provider].authComplete == 'function') {
        return config[provider].authComplete(auth, function(err, auth) {
            callback(auth);
        });
    }
    callback(auth);
}

function finishOAuth2Post (provider, body, callback) {
    callback({token: body,
              clientID: apiKeys[provider].appKey,
              clientSecret: apiKeys[provider].appSecret});
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