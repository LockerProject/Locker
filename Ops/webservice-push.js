var pushManager = require(__dirname + '/../Common/node/lpushmanager')
  , dataStore = require(__dirname + '/../Common/node/ldatastore')
  ;

module.exports = function(locker) {
    // get the map of available datasets
    locker.get('/push', function(req, res) {
        res.writeHead(200, {
            'Content-Type': 'text/javascript',
            "Access-Control-Allow-Origin" : "*"
        });
        res.end(JSON.stringify(pushManager.datasets));
    });

    // take data and push it into a collection!
    locker.post('/push/:dataset', function(req, res) {
        pushManager.acceptData(req.params.dataset, req.body, function() {
            res.send('ok');
        });
    });

    // copy pasta from the synclet code, these should be utilizing some generic stuff instead
    locker.get('/push/:dataset/getCurrent', function(req, res) {
        dataStore.init("push", function() {
            var type = req.params.type;
            var options = {};
            if(req.query['limit']) options.limit = parseInt(req.query['limit']);
            if(req.query['offset']) options.skip = parseInt(req.query['offset']);

            dataStore.getAllCurrent("push", "push_" + req.params.dataset, function(err, objects) {
                if (err) {
                    res.writeHead(500, {'content-type' : 'application/json'});
                    res.end('{error : ' + err + '}')
                } else {
                    res.writeHead(200, {'content-type' : 'application/json'});
                    res.end(JSON.stringify(objects));
                }
            }, options);
        });
    });

    locker.get('/push/:dataset/:id', function(req, res) {
        dataStore.init("push", function() {
            dataStore.getCurrent("push", "push_" + req.params.dataset, req.params.id, function(err, doc) {
                if (err) {
                    console.error(err);
                    res.end();
                } else if (doc) {
                    res.writeHead(200, {'content-type' : 'application/json'});
                    res.end(JSON.stringify(doc));
                } else {
                    res.writeHead(404);
                    res.end();
                }
            });
        });
    });
};
