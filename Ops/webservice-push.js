var pushManager = require(__dirname + '/../Common/node/lpushmanager')
  , dataStore = require(__dirname + '/../Common/node/ldatastore')
  , logger = require(__dirname + '/../Common/node/logger');
  ;

module.exports = function(locker) {
    locker.all('/push/:dataset*', function(req, res, next) {
        if (RegExp("^[a-zA-Z0-9_]*$").test(req.params.dataset)) {
            next();
        } else {
            res.send('Invalid dataset name', 500);
        }
    });
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
        pushManager.acceptData(req.params.dataset, req.body, function(err) {
            if (err) {
                res.send(err, 500);
            } else {
                res.send('ok');
            }
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
                    res.send({error : err}, 500);
                } else {
                    res.send(objects, 200);
                }
            }, options);
        });
    });

    locker.get('/push/:dataset/:id', function(req, res) {
        dataStore.init("push", function() {
            dataStore.getCurrentId("push", "push_" + req.params.dataset, req.params.id, function(err, doc) {
                if (err) {
                    logger.error(err);
                    res.end();
                } else if (doc) {
                    res.send(doc);
                } else {
                    res.send('', 404);
                }
            });
        });
    });
};
