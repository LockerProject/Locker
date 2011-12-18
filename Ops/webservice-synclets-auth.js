var syncManager = require('lsyncmanager')
  , lconfig = require('lconfig')
  , logger = require('logger')
  , fs = require('fs')
  , path = require('path')
  , locker = require('../Common/node/locker')
  , request = require('request')
  , querystring = require('querystring');

var handlers = {oauth2: handleOAuth2, oauth2Post: handleOAuth2Post}
  , apiKeys = {}
  , config = {};

try {
    apiKeys = JSON.parse(fs.readFileSync(lconfig.lockerDir + "/Config/apikeys.json", 'utf-8'))
} catch(e) { }

var host = lconfig.externalBase + "/";

module.exports = function(locker) {
    var avail = syncManager.synclets().available;
    for(var i in avail) {
        var service = avail[i].provider;
        var thisConfig = config[avail[i].provider] = require(path.join(lconfig.lockerDir,avail[i].srcdir, 'auth.js'));
        if(typeof thisConfig.handler == 'string') {
            addOauth2Handler(locker, service);
        } else if(typeof thisConfig.handler == 'function') {
            addCustomHandler(locker, service);
        }
    }
};

function addOauth2Handler(locker, service) {
    locker.get('/auth/' + service + '/auth', function(req, res) {
        handlers[config[service].handler](service, req.param('code'), config[service], res);
    });
}

function addCustomHandler(locker, service) {
    locker.get('/auth/' + service + '/auth', function(req, res) {
        config[service].handler(host, apiKeys[service], function(err, auth) {
            finishAuth(service, auth, res);
        }, req, res);
    });
}

function handleOAuth2 (service, code, options, res) {
    try {
        var newUrl = options.endPoint + '/access_token' +
                        '?client_id=' + apiKeys[service].appKey +
                        '&client_secret=' + apiKeys[service].appSecret +
                        '&grant_type=' + options.grantType +
                        '&redirect_uri=' + host + 'auth/' + service + '/auth' +
                        '&code=' + code;
        request.get({url:newUrl}, function(err, resp, body) {
            auth = {};
            if (options.accessTokenResponse == 'json') {
                auth.accessToken = JSON.parse(body).access_token;
            } else {
                auth.accessToken = querystring.parse(body).access_token;
            }
            if (service === 'github') {
                request.get({url:"https://github.com/api/v2/json/user/show?access_token=" + auth.accessToken}, function(err, resp, body) {
                    try {
                        var resp = JSON.parse(body);
                        auth.username = resp.user.login;
                        finishAuth(service, auth, res);
                    } catch (e) {
                        logger.error('Failed to auth github - ' + body);
                    }
                });
            } else if (auth.accessToken) {
                finishAuth(service, auth, res);
            } else {
                res.end(body);
            }
        });
    } catch (E) {
        res.end('failed to authenticate against service - ' + E);
    }
}

function handleOAuth2Post (service, code, options, res) {
    try {
        var postData = {grant_type:options.grantType,
                  code:code,
                  client_id:apiKeys[service].appKey,
                  client_secret:apiKeys[service].appSecret,
                  redirect_uri:host + 'auth/' + service + '/auth'};
        request({method: 'POST', uri :options.endPoint, body: querystring.stringify(postData), headers : {'Content-Type' : 'application/x-www-form-urlencoded'}}, function(err, resp, body) {
            auth = {};
            auth.clientID = apiKeys[service].appKey;
            auth.clientSecret = apiKeys[service].appSecret;
            auth.token = JSON.parse(body);
            finishAuth(service, auth, res);
        });

    } catch (E) {
        logger.error("auth error: "+E);
        res.end('failed to authenticate against service - ' + E);
    }
}

function finishAuth(service, auth, res) {
    installSynclet(service, auth);
    res.end("<script type='text/javascript'>  window.opener.syncletInstalled('" + service + "'); window.close(); </script>");
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
