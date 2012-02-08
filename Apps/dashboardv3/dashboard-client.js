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
  , ejs = require("ejs")
  , locker
  , request = require('request')
  , async = require('async')
  // TODO:  This should not be used in an app
  , lconfig = require('lconfig.js')
  , github = false
  , githubLogin = ''
  , form = require('connect-form')
  , uistate = require(__dirname + '/uistate')
  , profileImage = 'img/default-profile.png'
  , path = require('path')
  , fs = require('fs')
  , im = require('imagemagick')
  , util = require("util")
  , lutil = require('lutil')
  , moment = require("moment")
  , page = ''
  , connectSkip = false
  ;

ejs.filters.capitalAll = function(obj) {
    return obj.map(
        function(word) {
          return word.charAt(0).toUpperCase() + word.substr(1);
        }
    );
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
    app.use(express.bodyParser());
    app.use(form({ keepExtensions: true }));
    app.use(express.static(__dirname + '/static'));
    app.dynamicHelpers({
        dashboard: function(req, res) {
            return lconfig.dashboard;
        },
        profileImage: function(req, res) {
            return profileImage;
        },
        page: function(req, res) {
            return page;
        }
    });
});

function checkInstalled(req, res, next) {
    if(connectSkip) return next();
    getInstalledConnectors(function(err, installedConnectors) {
        if (installedConnectors.length === 0) {
            return res.redirect(lconfig.externalBase + '/dashboard/explore#Explore-connect');
        } else {
            connectSkip = true;
            return next();
        }
    });
}

app.all('*', function(req, res, next) {
    lutil.avatarUrlFromMap(process.cwd, locker.lockerBase, function (err, url) {
        if (!err) profileImage = url;
    });
    request.get({url:locker.lockerBase + "/synclets/github/getCurrent/profile"}, function(err, res, body) {
        try {
            body = JSON.parse(body);
            if (body[0].login) {
                githubLogin = body[0].login;
            }
        } catch (E) {}
    });
    next();
});


var clickApp = function(req, res) {
    var clickedApp = req.params.app;
    if (clickedApp) {
        uistate.appClicked(clickedApp);
    }
    res.end();
};

var renderApps = function(req, res) {
    uistate.fetchState();
    getInstalledApps(function(sortedResult) {
        res.render('iframe/appsList', {
            layout: false,
            apps: sortedResult
        });
    });
};

var renderSettings = function(req, res) {
    res.render('settings', {dashboard: lconfig.dashboard});
};

var renderSettingsConnectors = function(req, res) {
    getConnectors(function(err, connectors) {
        var numInstalled = 0;
        for (var i=0; i<connectors.length; i++) {
            if (connectors[i].hasOwnProperty('authed')) {
                numInstalled++;
            }
        }
        res.render('iframe/settings-connectors', {
            layout: false,
            numInstalled: numInstalled,
            connectors: connectors
        });
    });
};

var renderSettingsAccountInformation = function(req, res) {
    res.render('iframe/settings-account', {
        layout: false,
        config: {}
    });
};

var handleSettings = function (req, res, next) {
    if (!req.params || !req.params.avi_url) return res.send('missing parameter', 400);

    var rawAvatar = 'raw-avatar';
    lutil.fetchAndResizeImageURL(req.params.avi_url, 'raw-avatar', 'avatar.png', function (err, success) {
        if (err) return res.send(err, 500);

        return res.send(success);
    });
};

var renderSettingsAPIKey = function(req, res) {
    res.render('iframe/settings-api', {
        layout: false
    });
};

var renderAppGallery = function(req, res) {
    page = 'appGallery';
    getConnectors(function(error, connectors) {
        var c = [];
        res.render('appGallery', {synclets:connectors});
    });
};

var renderDevelop = function(req, res) {
    page = 'develop';
    res.render('develop', {});
};

var renderPublish = function(req, res) {
    getMyGithubApps(function(apps) {
        if(!apps[req.param("app")]) return res.send('invalid app id of '+req.param("app"), 400);
        var pkg = {};
        try {
            console.log("Parsing: " + path.join(lconfig.lockerDir, apps[req.param("app")].srcdir, "package.json"));
            pkg = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir, apps[req.param("app")].srcdir, "package.json")));
            if(path.existsSync(path.join(lconfig.lockerDir, apps[req.param("app")].srcdir, "screenshot.png"))) pkg.screenshot = true;
        } catch (E) {
            pkg = {};
        }
        console.dir(pkg);
        res.render('iframe/publish', {
            layout: false,
            app: pkg
        });
    });
};

var submitPublish = function(req, res) {
    if (!req.params.handle) return res.send('missing handle to publish', 404);
    var handle = req.params.handle;
    getMyGithubApps(function(apps){
        if(!apps[handle]) return res.send('no publishable package by the name of '+handle, 400);
        request.post({uri: locker.lockerBase + '/registry/publish/' + handle, json:true}, function(err, resp, body) {
            if(err) {
                console.error('error publishing ' + handle + ', got status code ' + resp.statusCode, err);
                return res.send(body);
            }
            if(resp.statusCode != 200) {
                console.error('error publishing ' + handle + ', got status code ' + resp.statusCode + ':', body);
                return res.send(body);
            }
            if(!body) {
                console.error('error publishing ' + handle + ':', body);
                return res.send(body);
            }
            if(body.err) {
                if(typeof body.err == 'string' && body.err.indexOf("failed to create issue") != -1) {
                    return res.send({err:"Github auth error.", reauth:true});
                }
                console.error('error publishing ' + handle + ':', body.err);
                return res.send(body);
            }
            var reloadScript = '<script type="text/javascript">parent.window.location.reload();</script>';
            // Send the screenshot
            var filePath = path.join(lconfig.lockerDir, apps[handle].srcdir, 'screenshot.png');
            var stat = fs.statSync(filePath);
            var ssPut = request({method:"PUT", uri:locker.lockerBase + "/registry/screenshot/" + handle,
                                headers:{"Content-Type":"image/png"}, body:fs.readFileSync(filePath)}, function(err, result, ssBody) {
                if (err) {
                    console.log("Error sending screenshot from dashboard: " + err);
                    console.log(err.stack);
                   return res.send({err:"Unable to upload your screenshot."});
                }
                res.send(body);
            });
        });
    });
};

var getAppsInfo = function(count, callback) {
    locker.mapType('app', function(err, map) {
        var result = map;
        var sortedResult = [];

        var recentApps = uistate.getNLastUsedApps(count);
        var added = {};
        for (var i = 0; i < recentApps.length; i++) {
            for (var j in result) {
                if (result[j].id === recentApps[i].name && result[j].static) {
                    result[j].lastUsed = recentApps[i].lastUsed;
                    sortedResult.push(result[j]);
                    added[result[j].id] = true;
                    break;
                }
            }
        }
        for (i in result) {
            if(!added[result[i].id] && result[i].title) sortedResult.push(result[i]);
        }

        callback(sortedResult);
    });
};

var getAllAppsInfo = function(count, callback) {
    locker.mapType('app', function(err, map) {
        var result = [];
        var sortedResult = [];

        var recentApps = uistate.getNLastUsedApps(count);
        var added = {};
        for (var i = 0; i < recentApps.length; i++) {
            for (var j in map) {
                if (map[j].id === recentApps[i].name && map[j].static) {
                    map[j].lastUsed = recentApps[i].lastUsed;
                    sortedResult.push(map[j]);
                    added[map[j].id] = true;
                    break;
                }
            }
        }
        for (i in map) {
            if(!added[map[i].id] && map[i].title) sortedResult.push(map[i]);
        }

        callback(sortedResult);
    });
};

var renderConnect = function(req, res) {
    getConnectors(function(err, connectors) {
        var numInstalled = 0;
        for (var i=0; i<connectors.length; i++) {
            if (connectors[i].hasOwnProperty('authed')) {
                numInstalled++;
            }
        }
        res.render('iframe/connect', {
            layout: false,
            numInstalled: numInstalled,
            connectors: connectors
        });
    });
};

var renderExplore = function(req, res) {
    uistate.fetchState();
    var firstVisit = false;
    var page = 'explore';

    getSidebarData(function(sidebarData) {
        if (req.cookies.firstvisit === 'true' && sidebarData.installedConnectors.length === 0) {
            firstVisit = true;
            //res.clearCookie('firstvisit');
        }

        if (sidebarData.installedConnectors.length === 0) {
            page += '-connect';
        }
        res.render(page, {
            connectors: sidebarData.connectors,
            installedConnectors: sidebarData.installedConnectors,
            map: sidebarData.installedApps,
            myMap: sidebarData.myApps,
            firstVisit: firstVisit
        });
    });
};

var renderAppGallery = function(req, res) {
    getSidebarData(function(sidebarData) {
        res.render('appGallery', {
            connectors: sidebarData.connectors,
            installedConnectors: sidebarData.installedConnectors,
            map: sidebarData.installedApps,
            myMap: sidebarData.myApps
        });
    });
};

var renderDevelop = function(req, res) {
    getSidebarData(function(sidebarData) {
        res.render('explore', {
            connectors: sidebarData.connectors,
            installedConnectors: sidebarData.installedConnectors,
            map: sidebarData.installedApps,
            myMap: sidebarData.myApps
        });
    });
};

var renderDevelopBuildApp = function(req, res) {
    res.render('iframe/develop-buildapp', {
        layout: false
    });
};

var registryApp = function(req, res) {
    request.get({uri: locker.lockerBase + '/registry/app/' + req.param('params')}, function(err, resp, body) {
        var app = JSON.parse(body);
        res.render('iframe/registryApp', {
            layout: false,
            breadcrumb: req.param('breadcrumb'),
            app: app
        });
    });
};

var getMyGithubApps = function(callback) {
    var pattern = /^Me\/github/;
    var apps = {};
    locker.map(function(err, map) {
        for (var i in map) {
            if (pattern.exec(map[i].srcdir)) {
                var appInfo = map[i];
                if (!appInfo.title) appInfo.title = "no title";
                var appId = appInfo.id.toLowerCase();
                apps[appInfo.id] = appInfo;
            }
        }
        callback(apps);
    });
};

/*
var getMyRegistryApps = function(callback) {
    request.get({uri: locker.lockerBase + '/registry/myApps'}, function(err, resp, body) {
        callback(JSON.parse(body));
    });
};

var getAllRegistryApps = function(callback) {
    request.get({uri: locker.lockerBase + '/registry/apps'}, function(err, resp, body) {
        apps = JSON.parse(body);
        request.get({uri: locker.lockerBase + '/registry/added'}, function(err, resp, added) {
            //added = JSON.parse(added);
            for (var i in added) {
                if (apps[i]) {
                    apps[i].installed = true;
                }
            }
            callback(apps);
        });
    });
};*/


var getConnectors = function(callback) {
    locker.mapType("connector", function(err, installedConnectors) {
        request.get({uri:locker.lockerBase + "/registry/connectors", json:true}, function(err, regRes, body) {
            var connectors = [];
            Object.keys(body).map(function(key) {
                if (body[key].repository.type == "connector") {
                    var connector = body[key];
                    for (var i = 0; i < installedConnectors.length; ++i) {
                        if (installedConnectors[i].id === connector.name && installedConnectors[i].authed) {
                          connector.authed = true;
                          connector.username = getReadableProfileNameForConnector(installedConnectors[i]);
                        }
                    }
                    if (!connector.repository.oauthSize) {
                      connector.repository.oauthSize = {width:960, height:600};
                      console.error('no oauthSize for connector ' + connector.repository.handle + ', using default of width:960px, height:600px');
                    }
                    connectors.push(connector);
                }
            });
            getCollectionsUsedByConnectors(connectors, callback);
        });
    });
};

var getInstalledConnectors = function(callback) {
    getConnectors(function(err, connectors) {
       var installedConnectors = [];
       for (var i=0; i<connectors.length; i++) {
           if (connectors[i].hasOwnProperty('authed') && connectors[i].authed === true) {
               installedConnectors.push(connectors[i]);
           }
       }
       callback(err, installedConnectors);
    });
};

var getReadableProfileNameForConnector = function(connector) {

    // TODO: absolutely need to refactor this into the profile collection once we have it done.  Until then, here we are:
    try {
        switch(connector.handle){
        case 'facebook':
            return connector.auth.profile.username;
        case 'twitter':
            return '@' + connector.auth.profile.screen_name;
        case 'lastfm':
            return connector.auth.profile.name;
        case 'flickr': // TODO: flickr connector has empty auth object
            return '';
        case 'foursquare':
            return connector.auth.profile.canonicalUrl.split('/')[3];
        case 'gcontacts': // TODO: gcontacts connector has empty auth object
            return '';
        case 'instagram':
            return connector.auth.profile.username;
        case 'pandora': // TODO: pandora connector has empty auth object
            return '';
        case 'rdio':
            return connector.auth.profile.firstName + ' ' + connector.auth.profile.lastName;
        case 'github':
            return connector.auth.profile.login;
        default:
            return '';
        }
    } catch(e) { return ''; }
};

var getCollectionsUsedByConnectors = function(connectors, callback) {

    function findConnectorInObject(connector) {
        for(var j in connectors) {
            if (connectors.hasOwnProperty(j) && connectors[j].name === connector) {
               return connectors[j];
            }
        }
        return undefined;
    }

    // we hardwire the collections here with a nasty O(n^2) nested loop, b/c /registry/connectors
    // doesn't return the "provides" yet.
    function addProvidesToConnectors(map, collection) {
        if (map.hasOwnProperty(collection) && map[collection].hasOwnProperty('events') && lutil.is('Array', map[collection].events)) {
            for (var i=0; i<map[collection].events.length; i++) {
                var event = map[collection].events[i][0].split('/');
                var currentConn = findConnectorInObject(event[event.length -1]);
                if (currentConn !== undefined) {
                    if (!currentConn.hasOwnProperty('provides')) {
                        currentConn.provides = [];
                    }
                    var foundCollection = false;
                    for (var k=0; k<currentConn.provides.length; k++) {
                        if (currentConn.provides[k] === lutil.ucfirst(collection)) {
                            foundCollection = true;
                        }
                    }
                    if (!foundCollection) {
                        currentConn.provides.push(lutil.ucfirst(collection));
                    }
                }
            }
        }
    }

    locker.map(function(err, map) {
        if (map === undefined) {
            return console.error('Map undefined when attempting to get collections in dashboardv3');
        }

        addProvidesToConnectors(map, 'contacts');
        addProvidesToConnectors(map, 'photos');
        addProvidesToConnectors(map, 'links');
        addProvidesToConnectors(map, 'places');

        callback(err, connectors);
    });
};

var getSidebarData = function(callback) {
    function initIfError(err, data) {
        if (err) {
           data = [];
        }
    }

    async.parallel({
        installedAppsData: function(parallelCb) {
            getInstalledApps(function(err, result) {
                parallelCb(err, result);
            });
        },
        myAppsData: function(parallelCb) {
            getMyApps(function(err, result) {
                parallelCb(err, result);
            });
        },
        connectorsData: function(parallelCb) {
            getConnectors(function(err, result) {
                parallelCb(err, result);
            });
        },
        installedConnectorsData: function(parallelCb) {
            getInstalledConnectors(function(err, result) {
                parallelCb(err, result);
            });
        }     
    },
    function(err, results) {
        return callback({
            installedApps: results.installedAppsData,
            myApps: results.myAppsData,
            connectors: results.connectorsData,
            installedConnectors: results.installedConnectorsData 
        });
    });
}

var getFilteredApps = function(filterFn, callback) {
    locker.mapType('app', function(err, map) {
        var result = [];
        var added = {};
        async.forEach(map, function(app, forEachCb) {
            if (app.static && filterFn(app)) {
                result.push(app);
                added[app.id] = true;
            }
            forEachCb();
        }, function(err) {
            callback(err, result);
        });
    });
};

var getInstalledApps = function(callback) {
    return getFilteredApps(function(app) {
        return app.srcdir.substring(0,9) !== 'Me/github' && app.hidden !== true;
    }, callback);
};

var getMyApps = function(callback) {
    return getFilteredApps(function(app) {
        return app.srcdir.substring(0,9) === 'Me/github';
    }, callback);
};

var sendAvatar = function (req, res) {
    res.sendfile('avatar.png');
};

app.get('/clickapp/:app', clickApp);
app.get('/explore', renderExplore);
app.get('/', checkInstalled, renderExplore);

app.get('/connect', renderConnect);

app.get('/settings', renderSettings);
app.get('/settings-connectors', renderSettingsConnectors);
app.get('/settings-account', renderSettingsAccountInformation);
app.get('/settings-api', renderSettingsAPIKey);
app.post('/settings-account', handleSettings);

app.get('/allApps', renderApps);

app.get('/develop', renderDevelop);
app.get('/develop-buildapp', renderDevelopBuildApp);

app.get('/appGallery', renderAppGallery);

app.get('/publish', renderPublish);
app.get('/publish/:handle', submitPublish);

app.get('/registryApp', registryApp);
app.get('/avatar.png', sendAvatar);