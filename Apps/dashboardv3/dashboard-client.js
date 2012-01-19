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
  , request = require('request')
  // TODO:  This should not be used in an app
  , lconfig = require('lconfig.js')
  , github = false
  , githubLogin = ''
  , githubapps = {}
  , form = require('connect-form')
  , uistate = require(__dirname + '/state')
  , profileImage = 'img/default-profile.png'
  , path = require('path')
  , fs = require('fs')
  , im = require('imagemagick')
  , page = ''
  , connectPage = false
  , cropping = {}
  , oauthPopupSizes = {foursquare: {height: 540,  width: 960},
                 github: {height: 1000, width: 1000},
                 twitter: {width: 630, height: 500},
                 tumblr: {width: 630, height: 500},
                 facebook: {width: 980, height: 705},
                 instagram: {width: 800, height: 500},
                 flickr: {width: 1000, height: 877},
                 linkedin: {width: 491, height: 163}
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
    if (connectPage === false) {
        getInstalledConnectors(function(err, installedConnectors) {
            if (installedConnectors.length === 0) {
                connectPage = true;
                return res.redirect('/dashboard/you#connect');
            } else {
                next();
            }
        });
    } else {
        next();
        connectPage = false;
    }
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

var renderExplore = function(req, res) {
    page = 'explore';
    locker.mapType("connector", function(error, connectors) {
        res.render('explore', {synclets:connectors});
    });
}

var renderExploreApps = function(req, res) {
    getAllRegistryApps(function(apps) {
        locker.mapType("connector", function(error, connectors) {
            for (var i = 0; i < connectors.length; i++) {
                connectors[i].oauthSize = oauthPopupSizes[connectors[i].provider] || {width:960, height:600};
            }
            Object.keys(apps).forEach(function(key) { if (apps[key].repository.hidden) delete apps[key]; });
            // TODO:  Change all of these to small visitor style filters instead of spinning the list so much
            var data = {layout: false, apps: apps, connectors: connectors}
            if (req.param('author')) {
                data.breadcrumb = req.param('author');
                for (var i in apps) {
                    // yes i know this is gross, i just make sure all the proper variables are present before checking them
                    if (!apps[i].author || !apps[i].author.name || apps[i].author.name != req.param('author')) {
                        delete apps[i];
                    }
                }
                if (Object.keys(apps).length === 0) {
                    return res.send('No apps by that user!', 404);
                }
            } else if (req.param('types') || req.param('services')) {
                data.breadcrumb = 'filter';
                var types = {};
                if (req.param('types')) {
                    types.types = true;
                    data.types = req.param('types');
                }
                if (req.param('services')) {
                    types.services = true;
                    data.services = {};
                    for (var i = 0; i < req.param('services').length; i++) {
                        var actualConnector = connectors.filter(function(connector) { return connector.id == req.param('services')[i]; });
                        if (actualConnector.length > 0) {
                            actualConnector = actualConnector[0];
                            data.services[req.param('services')[i]] = actualConnector.title;
                        }
                    }
                }
                for (var i in apps) {
                    if (!apps[i].repository.uses) {
                        delete apps[i];
                    } else if (req.param('types') && !apps[i].repository.uses.types) {
                        delete apps[i];
                    } else if (req.param('params') && !apps[i].repository.uses.services) {
                        delete apps[i];
                    } else {
                        var valid = false;
                        for (var key in types) {
                            if (req.param(key)) {
                                for (var j = 0; j < req.param(key).length; j++) {
                                    if (apps[i].repository.uses[key].indexOf(req.param(key)[j]) > -1) {
                                        valid = true;
                                    }
                                }
                            }
                        }
                        if (!valid) {
                            delete apps[i];
                        }
                    }
                }
            }
            res.render('iframe/exploreApps', data);
        });
    });
}

var renderCreate = function(req, res) {
    page = 'create';
    getGithubApps(function(apps) {
        var publishedCount = 0;
        for (var i = 0; i < apps.length; i++) {
            if (apps[i].published) {
                publishedCount++;
            }
        }
        res.render('create', {
            published: publishedCount,
            draft: apps.length - publishedCount,
            apps: apps
        });
    });
}

var handleUpload = function(req, res) {
    if (req.form) {
        req.form.complete(function(err, fields, files) {
            if (err) {
                res.send('broken', 500);
            } else {
                var write = fs.createWriteStream('tempScreenshot');
                var uploadedFile = fs.createReadStream(files.file.path);
                write.once('open', function(fd) {
                    require('util').pump(uploadedFile, write);
                });
                res.send('ok');
            }
        });
    } else {
        res.send('broken', 500);
    }
}

var renderPublish = function(req, res) {
    getGithubApps(function(apps) {
        res.render('iframe/publish', {
            layout: false,
            apps: apps
        });
    });
}

var submitPublish = function(req, res) {
    if (req.form) {
        req.form.complete(function(err, fields, files) {
            if (fields['x']) {
                cropping[fields.app] = true;
            }
            if (err) res.write(JSON.stringify(err.message));
            if (fields['new-file'] === 'true') {
                fs.rename('tempScreenshot', path.join(lconfig.lockerDir, githubapps[fields.app].srcdir, 'screenshot'), function() {
                    cropImage(path.join(lconfig.lockerDir, githubapps[fields.app].srcdir, 'screenshot'), fields);
                });
            } else {
                if (fields['app-screenshot-url']) {
                    request.get({uri: fields['app-screenshot-url'], encoding: 'binary'}, function(err, resp, body) {
                        fs.writeFile(path.join(lconfig.lockerDir, githubapps[fields.app].srcdir, 'screenshot'), body, 'binary', function() {
                            cropImage(path.join(lconfig.lockerDir, githubapps[fields.app].srcdir, 'screenshot'), fields);
                        });
                    });
                }
            }
            fields.lastUpdated = Date.now();
            if (fields['app-publish'] === 'true') {
                var data = {
                    uses: githubapps[fields.app].uses,
                    desc: fields['app-description']
                }
                if (fields['rename-app'] === 'on') {
                    data.title = fields['app-newname'];
                } else {
                    data.title = fields['old-name'];
                }
                request.post({uri: locker.lockerBase + '/registry/publish/' + fields.app, json: data}, function(err, resp, body) {
                    if (!err) {
                        var reloadScript = '<script type="text/javascript">parent.app = "viewAll"; parent.loadApp(); parent.window.location.reload();</script>';
                        // Send the screenshot
                        // TODO:  See if jer's fix in publish.js of predetermining Content-Size allows the pipe to work
                        var ssPut = request({method:"PUT", uri:locker.lockerBase + "/registry/screenshot/" + body.name,
                                            headers:{"Content-Type":"image/png"},
                                            body:fs.readFileSync(path.join(lconfig.lockerDir, githubapps[fields.app].srcdir, 'screenshot'))});
                        // TODO:  All of this below is more correct for piping a file to the PUT request but it does not work.  Needs to be retested with node 0.6 and newer request.
                        /*
                        ssPut.on("data", function(body, result) {
                            console.log("ssPut data body: " + body);
                        });
                        ssPut.on("error", function(error) {
                            process.stderr.write("Error sending screenshot to registry " + error);
                        });
                        ssPut.on("end", function() {
                            res.send(reloadScript);
                        });
                        var readStream = fs.createReadStream(path.join(lconfig.lockerDir, githubapps[fields.app].srcdir, 'screenshot'));
                        readStream.on("pause", function() {
                            console.log("RS Paused");
                        });
                        readStream.on("data", function() {
                            console.log("Did stuff on the RS");
                        });
                        readStream.pipe(ssPut);
                        */
                    } else {
                        res.send(reloadScript);
                    }
                });
            } else {
                res.send('<script type="text/javascript">parent.app = "viewAll"; parent.loadApp();</script>');
            }
            uistate.saveDraft(fields);
        });
    } else {
        res.send(req.body);
    }
}

var cropImage = function(file, fields) {
    if (fields['x']) {
        im.crop({
            srcPath: file,
            dstPath: file,
            width: fields['w'],
            height: fields['h'],
            offset: {x: fields['x'], y: fields['y']}
        }, function(err, stdout, stderr) {
            im.resize({
                srcData: file,
                dstPath: file,
                width: 200,
                height: 200
            }, function() {
                cropping[fields.app] = false;
            });
        });
    }
}

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

var renderYou = function(req, res) {
    uistate.fetchState();

    getAppsInfo(8, function(sortedResult) {        
        getConnectors(function(err, connectors) {
            var firstVisit = false;
            var page = 'you';
            
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

var renderScreenshot = function(req, res) {
    if (githubapps[req.params.handle]) {
        if (cropping[req.params.handle]) {
            return res.sendfile(__dirname + '/static/img/loading6.gif');
        }
        path.exists(path.join(lconfig.lockerDir, githubapps[req.params.handle].srcdir, 'screenshot'), function(exists) {
            if (exists) {
                return res.sendfile(path.join(lconfig.lockerDir, githubapps[req.params.handle].srcdir, 'screenshot'));
            } else {
                return res.sendfile(__dirname + '/static/img/batman.jpg');
            }
        });
    } else {
        res.sendfile(__dirname + '/static/img/batman.jpg');
    }
};

var renderTempScreenshot = function(req, res) {
    res.sendfile('tempScreenshot');
}

var renderAllApps = function(req, res) {
    getGithubApps(function(apps) {
        res.render('iframe/allApps', {
            layout: false,
            apps: apps,
            cropping: cropping
        });
    });
};

var croppingFinished = function(req, res) {
    res.send(!cropping[req.params.app]);
}

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
app.get('/you', checkInstalled, renderYou);
app.get('/', checkInstalled, renderYou);

app.get('/connect', renderConnect);

app.get('/allApps', renderApps);
app.get('/create', renderCreate);

app.get('/explore', renderExplore);
app.get('/exploreApps', renderExploreApps);

app.get('/publish', renderPublish);
app.post('/publish', submitPublish);

app.get('/viewAll', renderAllApps);

app.get('/screenshot/:handle', renderScreenshot);

app.post('/publishScreenshot', handleUpload);
app.get('/tempScreenshot', renderTempScreenshot);
app.get('/finishedCropping/:app', croppingFinished);
app.get('/registryApp', registryApp);

var getGithubApps = function(callback) {
    uistate.fetchState();
    var apps = [];
    githubapps = {};
    var pattern = /^Me\/github/
    getRegistryApps(function(myPublishedApps) {
        locker.map(function(err, map) {
            for (var i in map) {
                if (pattern.exec(map[i].srcdir)) {
                    var appInfo = checkDraftState(map[i]);
                    if (!appInfo.title) continue
                    var appId = 'app-' + appInfo.id.toLowerCase();
                    if (myPublishedApps[appId]) {
                        appInfo.published = myPublishedApps[appId];
                    }
                    githubapps[appInfo.id] = appInfo;
                    apps.push(appInfo);
                }
            }
            callback(apps);
        });
    });
}

var getRegistryApps = function(callback) {
    request.get({uri: locker.lockerBase + '/registry/myApps'}, function(err, resp, body) {
        callback(JSON.parse(body));
    });
}

var getAllRegistryApps = function(callback) {
    request.get({uri: locker.lockerBase + '/registry/apps'}, function(err, resp, body) {
        apps = JSON.parse(body);
        request.get({uri: locker.lockerBase + '/registry/added'}, function(err, resp, added) {
            added = JSON.parse(added);
            for (var i in added) {
                if (apps[i]) {
                    apps[i].installed = true;
                }
            }
            callback(apps);
        });
    });
}

var checkDraftState = function(appInfo) {
    if (uistate.state.draftApps[appInfo.handle]) {
        appInfo.draft = uistate.state.draftApps[appInfo.handle];
        if (appInfo.draft['rename-app'] === 'on') {
            appInfo.title = appInfo.draft['app-newname'];
        }
        appInfo.desc = appInfo.draft['app-description'];
    } else {
        appInfo.draft = {};
    }
    appInfo.lastUpdated = new Date(appInfo.lastUpdated || appInfo.draft.lastUpdated || Date.now());
    return appInfo;
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
                    connector.oauthSize = oauthPopupSizes[connectors.provider] || {width:960, height:600};
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


/*
var getLocalConnectors = function(callback) {
    var connectors = [];
    locker.mapType(callback)(err, map) {;
        callback(err, map)
        Object.keys(map).forEach(function(key) {
            var service = map[key];
            if (service.type == "connector") {
                connectors.push(service);
            }
        }
        callback(err, connectors);
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
        callback(err, synclets);
    });
}
*/
