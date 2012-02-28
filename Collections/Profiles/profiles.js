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
  , path      = require('path')
  , locker    = require('locker')
  , lutil     = require('lutil')
  , logger
  , lockerInfo
  ;

var app = express.createServer(connect.bodyParser());

function fetchMap(callback) {
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

function fetchMappedByIDRs(callback) {
  fetchMap(function (map) {
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

function fetchMappedByHandles(callback) {
  fetchMap(function (map) {
    var profiles = {};

    for (var key in map) {
      if (!map[key].auth || !map[key].auth.profile) continue;

      if (profiles[key]) {
        profiles[key].push(map[key].auth.profile);
      } else {
        profiles[key] = [map[key].auth.profile];
      }
    }
    return callback(profiles);
  });
}

app.get('/', function (req, res) {
  fetchMappedByIDRs(function (profiles) {
    return res.send(profiles);
  });
});

app.get('/handle/:handle', function (req, res, next) {
  fetchMappedByHandles(function (profiles) {
    var handle = req.param('handle');
    var profile = profiles[handle];
    if (!profile) return res.send({}, 404);

    return res.send(profile);
  });
});


/*
 * Avatars
 */

app.get('/avatar', function (req, res, next) {
  // always override if a local avatar exists
  if (path.existsSync(path.join(lockerInfo.workingDirectory, 'avatar.png'))) return res.send(lockerInfo.externalBase + '/avatar.png');

  fetchMappedByHandles(function (profiles) {
    if (profiles.twitter)    return res.send(profiles.twitter[0].profile_image_url_https);
    if (profiles.facebook)   return res.send('http://graph.facebook.com/' + profiles.facebook[0].username + '/picture');
    if (profiles.github)     return res.send(profiles.github[0].avatar_url);
    if (profiles.foursquare) return res.send(profiles.foursquare[0].photo);
    if (profiles.instagram)  return res.send(profiles.instagram[0].profile_picture);
    if (profiles.lastfm) {
      var lastImages = profiles.lastfm[0].image;
      for (var i in lastImages) {
        if (lastImages[i].size === 'small') return res.send(null, lastImages[i]['#text']);
      }
    }

    return res.send('no avatar available', 404);
  });
});

app.get('/avatar.png', function (req, res) {
  if (!path.existsSync(path.join(lockerInfo.workingDirectory, 'avatar.png'))) {
    return res.send('not found', 404);
  } else {
    return res.sendfile(path.join(lockerInfo.workingDirectory, 'avatar.png'));
  }
});


/*
 * Startup
 */

process.stdin.resume();
process.stdin.on('data', function (data) {
  lockerInfo = JSON.parse(data);
  locker.initClient(lockerInfo);
  if (!lockerInfo || !lockerInfo.workingDirectory) {
    process.stderr.write('Was not passed valid startup information.' + data + '\n');
    process.exit(1);
  }
  process.chdir(lockerInfo.workingDirectory);

  var lconfig = require('lconfig');
  lconfig.load('../../Config/config.json');
  logger = require('logger.js');

  locker.connectToMongo(function (mongo) {
    app.listen(0, function () {
      var returnedInfo = {port: app.address().port};
      process.stdout.write(JSON.stringify(returnedInfo));
    });
  });
});
