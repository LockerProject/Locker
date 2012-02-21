/*
 *
 * Copyright (C) 2012, The Locker Project
 * All rights reserved.
 *
 * Please see the LICENSE file for more information.
 *
 */

var express   = require('express')
  , connect   = require('connect')
  , request   = require('request')
  , url       = require('url')
  , locker    = require('locker')
  , lutil     = require('lutil')
  , logger
  , lockerInfo
  ;

var app = express.createServer(connect.bodyParser());

function fetchmap(callback) {
  request.get(lockerInfo.lockerUrl + '/map', function (req, res) {
    var map;
    try {
      map = JSON.parse(res.body);
    } catch (E) {
      logger.error('Error parsing JSON: ' + E);
    }

    return callback(map);
  });
}

function fetchprofiles(callback) {
  fetchmap(function (map) {
    var profiles = {};

    for (var key in map) {
      if (!map[key].auth || !map[key].auth.profile) continue;

      var idr = {slashes: true, pathname: '/', host: key};
      // the type could be named something service-specific, usually 'contact' tho
      idr.protocol = (map[key].types && map[key].types.contact) ? map[key].types.contact : 'contact';
      // generate idrs from profiles, some services have both numeric and username (or more?)!
      var ids = map[key].profileIds || ['id'];
      for (var i in ids) {
        var id = ids[i];
        if (!map[key].auth.profile[id]) continue;

        idr.hash = map[key].auth.profile[id];
        profiles[url.format(idr)] = map[key].auth.profile;
      }
    }
    return callback(profiles);
  });
}

app.get('/', function (req, res) {
  fetchprofiles(function (profiles) {
    return res.send(profiles);
  });
});

app.get('/handle/:handle', function (req, res, next) {
  fetchprofiles(function (profiles) {
    var remapped = lutil.idrsToServices(profiles);
    var handle = req.param('handle');
    return res.send(remapped[handle]);
  });
});

// Process the startup JSON object
process.stdin.resume();
process.stdin.on('data', function (data) {
  lockerInfo = JSON.parse(data);
  locker.initClient(lockerInfo);
  if (!lockerInfo || !lockerInfo.workingDirectory) {
    process.stderr.write('Was not passed valid startup information.'+data+'\n');
    process.exit(1);
  }
  process.chdir(lockerInfo.workingDirectory);

  var lconfig = require('lconfig');
  lconfig.load('../../Config/config.json');
  logger = require('logger.js');

  locker.connectToMongo(function (mongo) {
    //sync.init(lockerInfo.lockerUrl, mongo.collections.contact, mongo, lconfig);
    app.listen(0, function () {
      var returnedInfo = {port: app.address().port};
      process.stdout.write(JSON.stringify(returnedInfo));
    });
  });
});


