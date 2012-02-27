var pushManager = require(__dirname + '/../Common/node/lpushmanager')
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
        res.send(pushManager.datasets);
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

    locker.get('/push/:dataset/getCurrent', function(req, res) {
        pushManager.getIJOD(req.params.dataset, false, function(ijod) {
            if(!ijod) return res.send("not found",404);
            ijod.reqCurrent(req, res);
        });
    });

    locker.get('/push/:dataset/:id', function(req, res) {
        pushManager.getIJOD(req.params.dataset, false, function(ijod) {
            if(!ijod) return res.send("not found",404);
            ijod.reqID(req, res);
        });
    });

    locker.get('/push/:dataset/id/:id', function(req, res) {
        pushManager.getIJOD(req.params.dataset, false, function(ijod) {
            if(!ijod) return res.send("not found",404);
            ijod.reqID(req, res);
        });
    });
};
