/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var express = require('express')
  , connect = require('connect')
  , locker
  , lconfig = require(__dirname + '/../../Common/node/lconfig.js')
  , github = false
  , uistate = require(__dirname + '/state')
  , oauthPopupSizes = {foursquare: {height: 540,  width: 960},
                 github: {height: 1000, width: 1000},
                 twitter: {width: 630, height: 500},
                 tumblr: {width: 630, height: 500},
                 facebook: {width: 980, height: 705},
                 instagram: {width: 800, height: 500},
                 flickr: {width: 1000, height: 877}
                };

module.exports = function(passedLocker, passedExternalBase, listenPort, callback) {
    lconfig.load('../../Config/config.json');
    locker = passedLocker;
    app.listen(listenPort, callback);
};

var app = express.createServer();
app.use(express.cookieParser());

app.configure(function() {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.set('view options', {
      layout: false
    });
    app.use(express.bodyParser());
    app.use(express.static(__dirname + '/static'));
});

var clickApp = function(req, res) {
    var clickedApp = req.params.app;
    if (clickedApp) {
        uistate.appClicked(clickedApp);
    }
    res.end();
}

var drawPage = function(req, res) {
    uistate.fetchState();
    locker.synclets
    locker.map(function(err, map) {
        var result = [];
        var sortedResult = [];
        for (var i in map.installed) {
            if (map.installed[i].is === 'app') {
                result.push(map.installed[i]);
            }
        }
        var recentApps = uistate.getNLastUsedApps(8);
        var added = {};
        for (var i = 0; i < recentApps.length; i++) {
            for (var j in result) {
                if (result[j].id === recentApps[i].name && result[j].static) {
                    sortedResult.push(result[j]);
                    added[j] = true;
                    break;
                }
            }
        }
        for (var i in result) {
            if(result[i].static && !added[i]) sortedResult.push(result[i]);
        }
        locker.synclets(function(err, synclets) {
            for (var i in synclets.installed) {
                if (i === 'github') { github = true; }
                synclets.available.some(function(synclet) {
                    if (synclet.provider === synclets.installed[i].provider) {
                        synclets.available.splice(synclets.available.indexOf(synclet), 1);
                    }
                });
            }
            for (var i = 0; i < synclets.available.length; i++) {
                if (oauthPopupSizes[synclets.available[i].provider]) {
                    synclets.available[i].oauthSize = oauthPopupSizes[synclets.available[i].provider];
                } else {
                    synclets.available[i].oauthSize = {width: 960, height: 600};
                }
            }
            res.render('app', {
                synclets: synclets,
                github: github,
                map: sortedResult,
                dashboard: lconfig.dashboard
            });
        });
    });
};

app.get('/clickapp/:app', clickApp);
app.get('/app', drawPage);
app.get('/', drawPage);