var syncManager = require('lsyncmanager');

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

    require('synclet/dataaccess')(locker);
};
