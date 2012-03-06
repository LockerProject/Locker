var fs = require('fs');
var path = require('path');
var locker = require('locker');
var logger = require('logger');
var request = require('request');
var url = require('url');

module.exports = function(app, lockerInfo) {

  var dataStore = require(path.join(lockerInfo.sourceDirectory, 'dataStore.js'));
  locker.initClient(lockerInfo);

  locker.connectToMongo(function(mongo) {
    // initialize all our libs
    dataStore.init(mongo, locker, lockerInfo);
    // TODO: this is a race condition. The routes will be added before the dataStore is initialized
    // callback();
  });


  app.get('/state', function(req, res) {
    dataStore.state(function(err, state) {
      if(err) return res.send(err, 500)
      res.send(state);
    });
  });


  app.get('', function(req, res) {
    var fields = {};
    if (req.query.fields) {
      try {
        fields = JSON.parse(req.query.fields);
      } catch(E) {}
    }
    dataStore.getAll(fields, function(err, cursor) {
      if(!req.query.all) cursor.limit(20); // default 20 unless all is set
      if(req.query.limit) cursor.limit(parseInt(req.query.limit));
      if(req.query.offset) cursor.skip(parseInt(req.query.offset));
      if(req.query.stream == 'true') {
        res.writeHead(200, {'content-type' : 'application/jsonstream'});
        cursor.each(function(err, object){
          if (err) logger.error(err); // only useful here for logging really
          if (!object) return res.end();
          res.write(JSON.stringify(object)+'\n');
        });
      } else {
        cursor.toArray(function(err, items) {
          res.send(items);
        });
      }
    });
  });

  app.get('/since', function(req, res) {
    if (!req.query.id) return res.send([]);

    var results = [];
    dataStore.getSince(req.query.id, function(item) {
      results.push(item);
    }, function() {
      res.send(results);
    });
  });

  app.get('/id/:id', function(req, res, next) {
    if (req.param('id').length != 24) return next(req, res, next);
    dataStore.get(req.param('id'), function(err, doc) {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(doc));
    });
  });

}