var dataStore = require('../ldatastore')
  , fs = require('fs')
  , path = require('path')
  , lconfig = require('../lconfig')
  , logger = require('../logger')
  , lfs = require('../lfs')
  ;

module.exports = function(app) {
    // In adherence with the contact/* provider API
    // Returns a list of the current set of friends or followers
    app.get('/synclets/:syncletId/getCurrent/:type', function(req, res) {
        dataStore.init('synclets', function() {
            var type = req.params.type;
            var options = {};
            if(req.query['limit']) options.limit = parseInt(req.query['limit']);
            if(req.query['offset']) options.skip = parseInt(req.query['offset']);
            if(req.query["sort"]) {
                var sorter = {}
                if(req.query["order"]) {
                    sorter[req.query["sort"]] = +req.query["order"];
                } else {
                    sorter[req.query["sort"]] = 1;
                }
                options.sort = sorter;
            }

            if(req.query['stream'] == "true")
            {
                res.writeHead(200, {'content-type' : 'application/jsonstream'});
                dataStore.getEachCurrent('synclets', req.params.syncletId + "_" + req.params.type, function(err, object) {
                    if (err) logger.error(err); // only useful here for logging really
                    if (!object) return res.end();
                    res.write(JSON.stringify(object)+'\n');
                }, options);
            }else{
                // we need to cut it off somewhere as building the objects for 10ks/100ks+ result sets in ram is too much
                if(!options.limit) options.limit = 20;
                if(options.limit > 1000) options.limit = 1000;
                dataStore.getAllCurrent('synclets', req.params.syncletId + "_" + req.params.type, function(err, objects) {
                    if (err) {
                        res.writeHead(500, {'content-type' : 'application/json'});
                        res.end('{error : ' + err + '}')
                    } else {
                        res.send(objects);
                    }
                }, options);
            }
        });
    });

    // deprecated! 2012-01-12 by jer, pretty sure nothing uses this
    app.get('/synclets/:syncletId/get_profile', function(req, res) {
        lfs.readObjectFromFile(path.join(lconfig.lockerDir, lconfig.me, req.params.syncletId, 'profile.json'), function(userInfo) {
            res.writeHead(200, {"Content-Type":"application/json"});
            res.end(JSON.stringify(userInfo));
        });
    });

    app.get('/synclets/:syncletId/getPhoto/:id', function(req, res) {
        var id = req.param('id');
        dataStore.init('synclets', function() {
            fs.readdir(path.join(lconfig.lockerDir, lconfig.me, req.params.syncletId, 'photos'), function(err, files) {
                var file;
                for (var i = 0; files && i < files.length; i++) {
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
    });

    app.get('/synclets/:syncletId/:type/id/:id', function(req, res) {
        dataStore.init('synclets', function() {
            dataStore.getCurrent('synclets', req.params.syncletId + "_" + req.params.type, req.params.id, function(err, doc) {
                if (err) {
                    logger.error(err);
                    res.end();
                } else if (doc) {
                    res.writeHead(200, {'content-type' : 'application/json'});
                    res.end(JSON.stringify(doc));
                } else {
                    res.writeHead(404);
                    res.end("not found");
                }
            });
        });
    });
}
