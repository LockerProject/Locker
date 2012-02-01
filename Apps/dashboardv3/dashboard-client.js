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
  , util = require("util")
  , moment = require("moment")
  , page = ''
  , connectPage = false
  , cropping = {}
  ;

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
                return res.redirect(lconfig.externalBase + '/dashboard/you#You-connect');
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
};

var renderApps = function(req, res) {
    uistate.fetchState();
    getAppsInfo(null, function(sortedResult) {
        res.render('iframe/appsList', {
            layout: false,
            apps: sortedResult
        });
    });
};

var renderExplore = function(req, res) {
    page = 'explore';
    getConnectors(function(error, connectors) {
        var c = [];
        res.render('explore', {synclets:connectors});
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

var handleAviUpload = function (req, res) {
    if (!req.form) return res.send('bad form submission', 500);

    req.form.complete(function (err, fields, files) {
        if (err) return res.send('unable to process form: ' + err, 500);

        var uploaded = fs.createReadStream(files.avi.path);
        var avatar = fs.createWriteStream('tmpAvatar');

        avatar.once('open', function (fd) {
            util.pump(uploaded, avatar, function (err) {
                if (err) return res.send('unable to write file: ' + err, 500);

                im.resize({srcPath : 'tmpAvatar'
                         , dstPath : 'avatar.png'
                         , width   : 48
                         , height  : 48}
                        , function (err, stdout, stderr) {
                              if (err) return res.send('unable to convert file: ' + err, 500);

                              return res.send('ok');
                          });
            });
        });
    });
};

var renderSettingsAPIKey = function(req, res) {
    res.render('iframe/settings-api', {
        layout: false
    });
};

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
};

var handleUpload = function(req, res) {
    if (req.form) {
        req.form.complete(function(err, fields, files) {
            if (err) {
                res.send('broken', 500);
            } else {
                var write = fs.createWriteStream('tempScreenshot');
                var uploadedFile = fs.createReadStream(files.file.path);
                write.once('open', function(fd) {
                    util.pump(uploadedFile, write);
                });
                res.send('ok');
            }
        });
    } else {
        res.send('broken', 500);
    }
};

var renderPublish = function(req, res) {
    getGithubApps(function(apps) {
        res.render('iframe/publish', {
            layout: false,
            apps: apps
        });
    });
};

var submitPublish = function(req, res) {
    if (req.form) {
        req.form.complete(function(err, fields, files) {
            if (fields['x']) {
                cropping[fields.app] = true;
            }
            if (err) res.write(JSON.stringify(err.message));
            var handle = githubapps[fields.app].handle;
            if(!handle) return res.send('invalid app ' + fields.app, 400);
            var srcdir = githubapps[fields.app].srcdir;
            if (fields['new-file'] === 'true') {
                fs.rename('tempScreenshot', path.join(lconfig.lockerDir, srcdir, 'screenshot'), function() {
                    cropImage(path.join(lconfig.lockerDir, srcdir, 'screenshot'), fields, done);
                });
            } else if (fields['app-screenshot-url']) {
                request.get({uri: fields['app-screenshot-url'], encoding: 'binary'}, function(err, resp, body) {
                    fs.writeFile(path.join(lconfig.lockerDir, srcdir, 'screenshot'), body, 'binary', function() {
                        cropImage(path.join(lconfig.lockerDir, srcdir, 'screenshot'), fields, done);
                    });
                });
            } else {
                done();
            }
            function done() {
                fields.lastUpdated = Date.now();
                if (fields['app-publish'] === 'true') {
                    var data = {
                        uses: githubapps[fields.app].uses,
                        description: fields['app-description']
                    };
                    if (fields['rename-app'] === 'on') {
                        data.title = fields['app-newname'];
                    } else {
                        data.title = fields['old-name'];
                    }
                    request.post({uri: locker.lockerBase + '/registry/publish/' + handle, json: data}, function(err, resp, body) {
                        if(err) {
                            console.error('error publishing ' + handle + ', got status code ' + resp.statusCode, err);
                            return res.send('error publishing' + err, 500);
                        }
                        if(resp.statusCode != 200) {
                            console.error('error publishing ' + handle + ', got status code ' + resp.statusCode + ':', body);
                            return res.send('error publishing: ' + body, 500);
                        }
                        var reloadScript = '<script type="text/javascript">parent.window.location.reload();</script>';
                        // Send the screenshot
                        var filePath = path.join(lconfig.lockerDir, srcdir, 'screenshot');
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
                        // TODO:  This still feels more proper, but is not working
                        /*
                        var readStream = fs.createReadStream(filePath);
                        readStream.on("data", function() {
                            console.log("Sent some image data");
                        });
                        readStream.on("end", function() {
                            console.log("image send done");
                        });
                        readStream.pipe(ssPut);
                        */
                    });
                } else {
                    res.send('<script type="text/javascript">parent.loadApp();</script>');
                }
                uistate.saveDraft(fields);
            }
        });
    } else {
        res.send(req.body);
    }
};

var cropImage = function(file, fields, callback) {
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
                callback();
            });
        });
    } else {
        callback();
    }
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
};

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
};

var renderAllApps = function(req, res) {
    getGithubApps(function(apps) {
        apps.forEach(function(app) {
            if (app.lastUpdated) app.lastUpdatedStr = moment(app.lastUpdated).fromNow();
        });
        res.render('iframe/allApps', {
            layout: false,
            apps: apps,
            cropping: cropping
        });
    });
};

var croppingFinished = function(req, res) {
    res.send(!cropping[req.params.app]);
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

app.get('/clickapp/:app', clickApp);
app.get('/you', checkInstalled, renderYou);
app.get('/', checkInstalled, renderYou);

app.get('/connect', renderConnect);

app.get('/settings', renderSettings);
app.get('/settings-connectors', renderSettingsConnectors);
app.get('/settings-account', renderSettingsAccountInformation);
app.get('/settings-api', renderSettingsAPIKey);
app.post('/settings-account', handleAviUpload);

app.get('/allApps', renderApps);
app.get('/create', renderCreate);

app.get('/explore', renderExplore);
// app.get('/exploreApps', renderExploreApps);

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
    var pattern = /^Me\/github/;
    getRegistryApps(function(myPublishedApps) {
        locker.map(function(err, map) {
            for (var i in map) {
                if (pattern.exec(map[i].srcdir)) {
                    var appInfo = checkDraftState(map[i]);
                    if (!appInfo.title) continue;
                    var appId = appInfo.id.toLowerCase();
                    if (myPublishedApps[appId]) {
                        appInfo.published = myPublishedApps[appId];
                    }
                    githubapps[appInfo.id] = appInfo;
                    apps.push(appInfo);
                    appInfo.lastUpdated = new Date(appInfo.lastUpdated || appInfo.draft.lastUpdated || (appInfo.published ? (appInfo.published.time ? appInfo.published.time.modified : null) : null) || Date.now());
                }
            }
            callback(apps);
        });
    });
};

var getRegistryApps = function(callback) {
    request.get({uri: locker.lockerBase + '/registry/myApps'}, function(err, resp, body) {
        callback(JSON.parse(body));
    });
};

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
};

var checkDraftState = function(appInfo) {
    if (uistate.state.draftApps[appInfo.handle]) {
        appInfo.draft = uistate.state.draftApps[appInfo.handle];
        if (appInfo.draft['rename-app'] === 'on') {
            appInfo.title = appInfo.draft['app-newname'];
        }
        appInfo.description = appInfo.draft['app-description'];
    } else {
        appInfo.draft = {};
    }
    return appInfo;
};

var getConnectors = function(callback) {
    locker.mapType("connector", function(err, installedConnectors) {
        request.get({uri:locker.lockerBase + "/registry/connectors", json:true}, function(err, regRes, body) {
            var connectors = [];
            Object.keys(body).map(function(key) {
                if (body[key].repository.type == "connector") {
                    var connector = body[key];
                    for (var i = 0; i < installedConnectors.length; ++i) {
                        if (installedConnectors[i].id == connector.name && installedConnectors[i].authed) {
                          connector.authed = true;
                          if (installedConnectors[i].hasOwnProperty('profileIds') &&
                              installedConnectors[i].profileIds.length === 2) {
                            var usernameIndex = installedConnectors[i].profileIds[1];
                            connector.username = installedConnectors[i].auth.profile[usernameIndex];
                          }
                        }
                    }
                    if (!connector.repository.oauthSize) {
                      connector.repository.oauthSize = {width:960, height:600};
                      console.error('no oauthSize for connector ' + connector.repository.handle + ', using default of width:960px, height:600px');
                    }
                    connectors.push(connector);
                }
            });
            callback(err, connectors);
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
