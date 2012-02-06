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
    // hackzzzzzzzzzzzzzzzzz
    // will replace when we have a reasonable notion of a user's profile
     request.get({url:locker.lockerBase + "/synclets/facebook/get_profile"}, function(error, res, body) {
         try {
             var body = JSON.parse(body);
             if (body.username) {
                 profileImage = "http://graph.facebook.com/" + body.username + "/picture";
             }
         } catch (E) {
             request.get({url:locker.lockerBase + "/synclets/twitter/get_profile"}, function(error, res, body) {
                 try {
                     var body = JSON.parse(body);
                     if (body.profile_image_url_https) {
                         profileImage = body.profile_image_url_https;
                     }
                 } catch (E) {}
             });
         }
    });
    request.get({url:locker.lockerBase + "/synclets/github/getCurrent/profile"}, function(err, res, body) {
        try {
            var body = JSON.parse(body);
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
}

var renderApps = function(req, res) {
    uistate.fetchState();
    getAppsInfo(null, function(sortedResult) {
        res.render('iframe/appsList', {
            layout: false,
            apps: sortedResult,
        });
    })
}

var renderAppGallery = function(req, res) {
    page = 'appGallery';
    getConnectors(function(error, connectors) {
        var c = [];
        res.render('appGallery', {synclets:connectors});
    });
}

var renderDevelop = function(req, res) {
    page = 'develop';
    res.render('develop', {});
}

var renderPublish = function(req, res) {
    getMyGithubApps(function(apps) {
        if(!apps[req.param("app")]) return res.send('invalid app id of '+req.param("app"), 400);
        var pkg = {};
        try {
            console.log("Parsing: " + path.join(lconfig.lockerDir, apps[req.param("app")].srcdir, "package.json"));
            pkg = JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir, apps[req.param("app")].srcdir, "package.json")));
        } catch (E) {
            pkg = {};
        }
        console.dir(pkg);
        res.render('iframe/publish', {
            layout: false,
            app: pkg
        });
    });
}

var submitPublish = function(req, res) {
    if (!req.params.handle) return res.send('missing handle to publish', 404);
    var id = req.params.handle;
    getGithubApps(function(apps){
        if(!apps[id]) return res.send('no publishable package by the name of '+id, 400);
        request.post({uri: locker.lockerBase + '/registry/publish/' + handle, json: data}, function(err, resp, body) {
            if(err) {
                console.error('error publishing ' + handle + ', got status code ' + resp.statusCode, err);
                return res.send('error publishing ' + err, 500);
            }
            if(resp.statusCode != 200) {
                console.error('error publishing ' + handle + ', got status code ' + resp.statusCode + ':', body);
                return res.send('error message from publishing: ' + body, 500);
            }
            if(!body) {
                console.error('error publishing ' + handle + ':', body);
                return res.send('error publishing, ' + JSON.stringify(body), 500);
            }
            if(body.err) {
                if(typeof body.err == 'string' && body.err.indexOf("failed to create issue") != -1) {
                    console.error('asking to re-auth');
                    // TODO this should link to or say to go to auth settings to re-auth instead of it being jacked in here!
                    var htm = '<script>function pop(){'
                        +'var options = "width=1000,height=1000,status=no,scrollbars=no,resizable=no";'
                        +'var popup = window.open("/auth/github", "account", options);'
                        +'popup.focus(); popup.opener = window;'
                        +'return false;'
                    +'}; var self = window; function syncletInstalled(){self.history.back();}</script>'
                    +'Oops, please <a href="/auth/github" onClick="pop()">re-authenticate</a> to github so that we can create an issue to track this request, thanks!';
                    return res.send(htm);
                }
                console.error('error publishing ' + handle + ':', body.err);
                return res.send('error publishing - ' + JSON.stringify(body.err), 500);
            }
            var reloadScript = '<script type="text/javascript">parent.window.location.reload();</script>';
            // Send the screenshot
            var filePath = path.join(lconfig.lockerDir, srcdir, 'screenshot.png');
            var stat = fs.statSync(filePath);
            var ssPut = request({method:"PUT", uri:locker.lockerBase + "/registry/screenshot/" + handle,
                                headers:{"Content-Type":"image/png"}, body:fs.readFileSync(filePath)}, function(err, result, body) {
                if (err) {
                    console.log("Error sending screenshot from dashboard: " + err);
                    console.log(err.stack);
                   return res.send(400);
                }
                res.send(reloadScript);
            });
        });
    });
};


var getAppsInfo = function(count, callback) {
    locker.map(function(err, map) {
        var result = [];
        var sortedResult = [];
        for (var i in map) {
            if ((map[i].type === 'app' || map[i].type === 'app') && !map[i].hidden) {
                result.push(map[i]);
            }
        }
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
        for (var i in result) {
            if(!added[result[i].id] && result[i].title) sortedResult.push(result[i]);
        }

        callback(sortedResult);
    });
}

var renderExplore = function(req, res) {
    uistate.fetchState();
    getAppsInfo(8, function(sortedResult) {
        getConnectors(function(err, connectors) {
            var firstVisit = false;
            var page = 'explore';

            getInstalledConnectors(function(err, installedConnectors) {
                if (req.cookies.firstvisit === 'true' &&
                    installedConnectors.length === 0) {
                    firstVisit = true;
                    //res.clearCookie('firstvisit');
                }

                if (installedConnectors.length === 0) {
                    page += '-connect';
                }
                res.render(page, {
                    connectors: connectors,
                    installedConnectors: installedConnectors,
                    map: sortedResult,
                    firstVisit: firstVisit
                });
            });
        });
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

var registryApp = function(req, res) {
    request.get({uri: locker.lockerBase + '/registry/app/' + req.param('params')}, function(err, resp, body) {
        var app = JSON.parse(body);
        res.render('iframe/registryApp', {
            layout: false,
            breadcrumb: req.param('breadcrumb'),
            app: app
        });
    });
}

app.get('/clickapp/:app', clickApp);
app.get('/explore', renderExplore);
app.get('/', checkInstalled, renderExplore);

app.get('/connect', renderConnect);

app.get('/develop', renderDevelop);

app.get('/appGallery', renderAppGallery);

app.get('/publish', renderPublish);
app.get('/publish/:handle', submitPublish);

app.get('/registryApp', registryApp);

var getMyGithubApps = function(callback) {
    var pattern = /^Me\/github/
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
}

var getMyRegistryApps = function(callback) {
    request.get({uri: locker.lockerBase + '/registry/myApps'}, function(err, resp, body) {
        callback(JSON.parse(body));
    });
}

var getAllRegistryApps = function(callback) {
    request.get({uri: locker.lockerBase + '/registry/apps'}, function(err, resp, body) {
        callback(JSON.parse(body));
    });
}

var getConnectors = function(callback) {
    locker.mapType("connector", function(err, installedConnectors) {
        request.get({uri:locker.lockerBase + "/registry/connectors", json:true}, function(err, regRes, body) {
            var connectors = [];
            Object.keys(body).map(function(key) {
                if (body[key].repository.type == "connector") {
                    var connector = body[key];
                    for (var i = 0; i < installedConnectors.length; ++i) {
                        if (installedConnectors[i].id == connector.name && installedConnectors[i].authed) connector.authed = true;
                    }
                    if(!connector.repository.oauthSize) {
                      connector.repository.oauthSize = {width:960, height:600};
                      console.error('no oauthSize for connector ' + connector.repository.handle + ', using default of width:960px, height:600px');
                    }
                    connectors.push(connector);
                }
            });
            callback(err, connectors);
        });
    });
}

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
}
