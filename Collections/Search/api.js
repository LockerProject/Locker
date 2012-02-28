var fs = require('fs');
var path = require('path');
var locker = require('locker');
var logger = require('logger');
var lutil = require('lutil');
var request = require('request');
var url = require('url');
var async = require('async');
var index = require('./index');

module.exports = function(app, lockerInfo) {

  locker.initClient(lockerInfo);

  index.init(path.join(lockerInfo.workingDirectory, 'index.db'), function(err) {
    if(err) logger.error(err);
  });


  app.get('/query', function(req, res) {
    var args = {};
    args.q = lutil.trim(req.param('q'));
    if (!args.q || args.q.length == 0) {
      logger.warn('missing or invalid query');
      return res.send('missing or invalid query');
    }

    args.limit = 20;
    if (req.param('type')) args.type = req.param('type');
    if (req.param('limit')) args.limit = parseInt(req.param('limit'));
    if (req.param('snippet') == "true") args.snippet = true;
    if (req.param('sort') == "true") args.sort = true;
    if (req.param('type')) args.q = "idr:"+req.param('type')+" "+args.q;

    var all = []; // to keep ordering
    var ndx = {}; // to keep uniqueness
    logger.info("performing query "+JSON.stringify(args));
    index.query(args, function(item){
      if(ndx[item.idr]) return;
      ndx[item.idr] = item;
      all.push(item);
    }, function(err){
      if(err) logger.error(err);
      async.forEachSeries(all, function(item, cb){
          var idr = url.parse(item.idr);
          if(!idr || !idr.host || !idr.hash) return cb();
          var u = lockerInfo.lockerUrl + '/Me/' + idr.host + '/id/' + idr.hash.substr(1) + "?full=true";
          request.get({uri:u, json:true}, function(err, res, body) {
              if(err) logger.error("failed to get "+u+" - "+err);
              if(body) item.data = body;
              cb();
          });
      }, function(err){
          if(err) logger.error(err);
          res.send(all);
      });
    });
  });

}