var dataStore = require('./dataStore');
var path = require('path');
var fs = require('fs');
var locker = require('locker');
var logger = require('logger');
var crypto = require('crypto');
var request = require('request');
var url = require('url');

module.exports = function(app, lockerInfo, prefix) {

  locker.initClient(lockerInfo);

  app.get('/state', function(req, res) {
    dataStore.getTotalLinks(function(err, countInfo) {
      if(err) return res.send(err, 500);
      dataStore.getLastObjectID(function(err, lastObject) {
        if(err) return res.send(err, 500);
        var objId = '000000000000000000000000';
        if (lastObject) objId = lastObject._id.toHexString();
        var updated = Date.now();
        try {
          var js = JSON.parse(path.join(lockerInfo.workingDirectory, fs.readFileSync('state.json')));
          if(js && js.updated) updated = js.updated;
        } catch(E) {}
        res.send({ready:1, count:countInfo, updated:updated, lastId:objId});
      });
    });
  });


  app.get('/search', function(req, res) {
    if (!req.query.q) return res.send([]);
    var u = url.parse(locker.lockerBase + '/Me/search/query');
    u.query = req.query;
    u.query.type = 'link';
    u.query.sort = 'true'; // default sorted
    // pretty much just dumb proxy it at this point
    request({url:url.format(u)}, function(err, resp, body){
      if(err || !body) return res.send(err, 500);
      res.writeHead(200, {'content-type' : 'application/json'});
      res.write(body);
      res.end();
    });
  });

  app.get('/since', function(req, res) {
    if (!req.query.id) return res.send([]);
    var results = [];
    dataStore.getSince(req.query.id, function(link) {
      results.push(link);
    }, function() {
      async.forEachSeries(results, function(link, callback) {
        if (!link) return;
        link.encounters = [];
        dataStore.getEncounters({'link':link.link}, function(encounter) {
          link.encounters.push(encounter);
        }, function() {
          callback();
        });
      }, function() {
        var sorted = results.sort(function(lh, rh) {
          return rh.at - lh.at;
        });
        res.send(sorted);
      });
    });
  });


  // expose way to get raw links and encounters
  app.get('/', function(req, res) {
    var full = isFull(req.query.full);
    var fullResults = [];
    var results = [];
    var options = {sort: {at: -1}};
    if(!req.query.all) options.limit = 20; // default 20 unless all is set
    if (req.query.limit) options.limit = parseInt(req.query.limit);
    if (req.query.offset) options.offset = parseInt(req.query.offset);
    var deleteLink = false;
    if (req.query.fields) {
      try {
        options.fields = JSON.parse(req.query.fields);
        // we need the link field for merging encounters and links objects
        // so get it, but flag it for deletion if not requested
        if(!options.fields.hasOwnProperty('link') || options.fields.link == 0) {
          options.fields.link = 1;
          deleteLink = true;
        }
      } catch(E) {}
    }
    var ndx = {};
    if(req.query.stream == 'true') {
        res.writeHead(200, {'content-type' : 'application/jsonstream'});
        options = {}; // exclusive
    }
    dataStore.getLinks(options, function(item) {
      if(req.query.stream == 'true') return res.write(JSON.stringify(item)+'\n');
      if(full) item.encounters = [];
      ndx[item.link] = item;
      // delete the link field if it wasn't requested
      if(deleteLink) delete item.link;
      results.push(item);
    }, function(err) {
      if(err) logger.error(err);
      if(req.query.stream == 'true') return res.end();
      if(full) {
        var arg = {link: {$in: Object.keys(ndx)}};
        if(options.fields) {
          arg.fields = {};
          // extract only encounter.* fields
          for(var i in options.fields) {
            if(i.length > 11 && i.substring(0,11) === 'encounters.') arg.fields[i.substring(11)] = options.fields[i];
          }
          // we need the link field for merging encounters and links objects
          // so get it, but flag it for deletion if not requested
          if(!arg.fields.hasOwnProperty('link') || arg.fields.link == 0) {
            arg.fields.link = 1;
            deleteLink = true;
          }
        }
        dataStore.getEncounters(arg, function(encounter) {
          ndx[encounter.link].encounters.push(encounter);
         // delete the link field if it wasn't requested
          if(deleteLink) delete encounter.link;
        }, function() {
          res.send(results);
        });
      } else {
        return res.send(results);
      }
    });
  });

  // expose way to get the list of encounters from a link id
  app.get('/encounters/:id', function(req, res) {
    var encounters = [];
    dataStore.get(req.param('id'), function(err, doc) {
      if(err || !doc || !doc.link) return res.send(encounters);
      dataStore.getEncounters({link: doc.link}, function(e){ encounters.push(e); }, function(err){ res.send(encounters); });
    });
  });

  app.get('/id/:id', function(req, res, next) {
    dataStore.get(req.param('id'), function(err, doc) {
      if(err || !doc) return res.send(err, 500);
      if(!doc.id) doc.id = crypto.createHash('md5').update(doc.link).digest('hex'); // older links are missing id, meh
      if(!isFull(req.query.full)) return res.send(doc);
      doc.encounters = [];
      dataStore.getEncounters({link: doc.link}, function(e){ doc.encounters.push(e); }, function(err) { res.send(doc); });
    });
  });

  locker.connectToMongo(function(mongo) {
    // initialize all our libs
    dataStore.init(mongo.collections.link, mongo.collections.encounter, mongo.collections.queue, mongo, logger);
    // callback();
  });
}

function isFull(full) {
  return (full === true || full === "true" || full == 1);
}
