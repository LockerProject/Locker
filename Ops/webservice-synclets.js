var syncManager = require('lsyncmanager');
var fs = require('fs');
var path = require('path');
var lconfig = require('lconfig');
var logger = require('logger');
var lfs = require('lfs');

module.exports = function(locker) {
    // get all the information about synclets
    locker.get('/synclets', function(req, res) {
        res.writeHead(200, {
            'Content-Type': 'text/javascript',
            "Access-Control-Allow-Origin" : "*"
        });
        var synclets = JSON.parse(JSON.stringify(syncManager.synclets()));
        for(var s in synclets.installed) {
            delete synclets.installed[s].config;
            delete synclets.installed[s].auth;
        }
        res.end(JSON.stringify(synclets));
    });

    // given a bunch of json describing a synclet, make a home for it on disk and add it to our map
    locker.post('/synclets/install', function(req, res) {
        if (!req.body.hasOwnProperty("srcdir")) {
            res.writeHead(400);
            res.end("{}")
            return;
        }
        var metaData = syncManager.install(req.body);
        if (!metaData) {
            res.writeHead(404);
            res.end("{}");
            return;
        }
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify(metaData));
    });

    locker.get('/synclets/:id/run', function(req, res) {
        syncManager.syncNow(req.params.id, req.query.id, false, function() {
            res.send(true);
        });
    });

    // not sure /post is the right base here but needed it for easy bodyparser flag
    locker.post('/post/:id/:synclet', function(req, res) {
        syncManager.syncNow(req.params.id, req.params.synclet, req.body, function() {
            res.send(true);
        });
    });

    // Returns a list of the current set of friends or followers
    locker.get('/synclets/:syncletId/getCurrent/:type', function(req, res) {
        syncManager.getIJOD(req.params.syncletId, req.params.type, false, function(ijod) {
            if(!ijod) return res.send("not found",404);
            ijod.reqCurrent(req, res);
        });
    });

    locker.get('/synclets/:syncletId/:type/id/:id', function(req, res) {
        syncManager.getIJOD(req.params.syncletId, req.params.type, false, function(ijod) {
            if(!ijod) return res.send("not found",404);
            ijod.reqID(req, res);
        });
    });

    locker.get('/synclets/:syncletId/get_profile', function(req, res) {
        lfs.readObjectFromFile(path.join(lconfig.lockerDir, lconfig.me, req.params.syncletId, 'profile.json'), function(userInfo) {
            res.writeHead(200, {"Content-Type":"application/json"});
            res.end(JSON.stringify(userInfo));
        });
    });

    locker.get('/synclets/:syncletId/getPhoto/:id', function(req, res) {
        var id = req.param('id');
        fs.readdir(path.join(lconfig.lockerDir, lconfig.me, req.params.syncletId, 'photos'), function(err, files) {
            var file;
            for (var i = 0; i < files.length; i++) {
                if (files[i].match('^' + id + '\\.[a-zA-Z0-9]+')) {
                    file = files[i];
                    break;
                }
            }
            if (file) {
                var stream = fs.createReadStream(path.join(lconfig.lockerDir, lconfig.me, req.params.syncletId, 'photos', file));
                var head = false;
                stream.on('data', function(chunk) {
                    if(!head) {
                        head = true;
                        res.writeHead(200, {'Content-Disposition': 'attachment; filename=' + file});
                    }
                    res.write(chunk, "binary");
                });
                stream.on('error', function() {
                    res.writeHead(404);
                    res.end();
                });
                stream.on('end', function() {
                    res.end();
                });
            } else {
                res.writeHead(404);
                res.end();
            }
        });
    });
};

