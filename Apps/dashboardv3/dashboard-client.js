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
  , lconfig = require(__dirname + '/../../Common/node/lconfig.js')
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
  , cropping = {}
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

app.all('*', function(req, res, next) {
    // hackzzzzzzzzzzzzzzzzz
    // will replace when we have a reasonable notion of a user's profile
    request.get({url:locker.lockerBase + "/synclets/facebook/get_profile"}, function(error, res, body) {
        try {
            var body = JSON.parse(body);
            if (body.username) {
                profileImage = "http://graph.facebook.com/" + body.username + "/picture";
            }
        } catch (E) {}
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
    res.render('explore');
}

var renderExploreApps = function(req, res) {
    getAllRegistryApps(function(apps) {
        res.render('iframe/exploreApps', {
            layout: false,
            apps: apps
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
                    desc: fields['app-description']
                }
                if (fields['rename-app'] === 'on') {
                    data.title = fields['app-newname'];
                } else {
                    data.title = fields['old-name'];
                }
                request.post({uri: locker.lockerBase + '/registry/publish/' + fields.app, json: data}, function(err, resp, body) {
                    res.send('<script type="text/javascript">parent.app = "viewAll"; parent.loadApp(); parent.window.location.reload();</script>');
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
        for (var i in map.installed) {
            if ((map.installed[i].is === 'app' || map.installed[i].type === 'app') && !map.installed[i].hidden) {
                result.push(map.installed[i]);
            }
        }
        var recentApps = uistate.getNLastUsedApps(count);
        var added = {};
        for (var i = 0; i < recentApps.length; i++) {
            for (var j in result) {
                if (result[j].id === recentApps[i].name && result[j].static) {
                    result[j].lastUsed = recentApps[i].lastUsed;
                    sortedResult.push(result[j]);
                    added[j] = true;
                    break;
                }
            }
        }
        for (var i in result) {
            if(result[i].static && !added[i]) sortedResult.push(result[i]);
        }
        callback(sortedResult);
    });
}

var renderYou = function(req, res) {
    uistate.fetchState();
    getAppsInfo(8, function(sortedResult) {
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
            page = 'you';
            res.render('you', {
                synclets: synclets,
                github: github,
                map: sortedResult
            });
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

app.get('/clickapp/:app', clickApp);
app.get('/you', renderYou);
app.get('/', renderYou);
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

var getGithubApps = function(callback) {
    uistate.fetchState();
    var apps = [];
    githubapps = {};
    var pattern = /^Me\/github/
    getRegistryApps(function(myPublishedApps) {
        locker.map(function(err, map) {
            for (var i in map.installed) {
                if (pattern.exec(map.installed[i].srcdir)) {
                    var appInfo = checkDraftState(map.installed[i]);
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
        callback(JSON.parse(body));
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
