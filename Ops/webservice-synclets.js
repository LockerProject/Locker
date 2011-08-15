var syncManager = require('lsyncmanager');

module.exports = function(locker) {
    // get all the information about synclets
    locker.get('/synclets', function(req, res) {
        res.writeHead(200, {
            'Content-Type': 'text/javascript',
            "Access-Control-Allow-Origin" : "*" 
        });
        res.end(JSON.stringify(syncManager.synclets()));
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
        syncManager.syncNow(req.params.id, function() {
            res.writeHead(200);
            res.end('DONE');
        })
    });
};