var request = require('request')
  , url     = require('url')
  , crypto  = require('crypto');

/*
 * http://www.last.fm/api/webauth
 */
exports.sign = function (query, auth) {
    md5 = crypto.createHash('md5');

    Object.keys(query).sort().forEach(function (key) {
        md5.update(key + query[key]);
    });
    md5.update(auth.appSecret);

    return md5.digest('hex');
};

exports.api = function (method, params, auth, cb) {
    params.method  = method;
    params.api_key = auth.appKey;
    params.user    = auth.user;
    params.sk      = auth.sk;
    params.api_sig = exports.sign(params, auth);
    // this HAS to go onto the query after the signing, or signature verification fails
    params.format  = 'json';

    // http://ws.audioscrobbler.com/2.0/
    request.get(url.format({protocol : 'http:'
                          , host     : 'ws.audioscrobbler.com'
                          , pathname : '/2.0/'
                          , query    : params})
              , cb);
}


exports.paged = function (synclet, method, params, processInfo, perPage, extractor, cb) {
    // Using config as a shared namespace requires care -- grab *only* the namespace you
    // need, or race conditions will cause properties to get stomped during simultaneous
    // synclet runs.
    var config = {paging : {}};
    if (processInfo.config && processInfo.config.paging && processInfo.config.paging[synclet]) {
        config.paging[synclet] = processInfo.config.paging[synclet];
    }
    else {
        config.paging[synclet] = {};
    }

    if (!config.paging[synclet].page) config.paging[synclet].page = 1;

    params.page  = config.paging[synclet].page;
    params.limit = perPage;

    exports.api(method
              , params
              , processInfo.auth
              , function (err, resp, body) {
                    if (err) {
                        cb(err);
                    }
                    else {
                        var js;
                        try {
                            js = JSON.parse(body);
                        }
                        catch (exc) { return cb(exc); }

                        if (js.error) return cb(js.message);

                        var objList = extractor(js);
                        if (objList.length < perPage) {
                            config.paging[synclet].page = 1;
                            config.nextRun = 0;
                        }
                        else { // still paging
                            config.paging[synclet].page += 1;
                            config.nextRun = -1;
                        }

                        cb(null, config, objList);
                    }
                }
    );
};

exports.getFriends = function (processInfo, friendHandler, cb) {
    var PAGESIZE = 50;

    exports.paged('friends'
                , 'user.getFriends'
                , {}
                , processInfo
                , PAGESIZE
                , function (js) {
                      return js.friends.user;
                  }
                , function (err, config, friends) {
                      if (err)  return cb(err);

                      for (var i = 0; i < friends.length; i += 1) friendHandler(friends[i]);

                      cb(null, config);
                  }
    );
}

exports.getScrobbles = function (processInfo, scrobbler, cb) {
    var PAGESIZE = 200;

    exports.paged('scrobbles'
                , 'user.getRecentTracks'
                , {}
                , processInfo
                , PAGESIZE
                , function (js) {
                      return (js && js.recenttracks) ? js.recenttracks.track : [];
                  }
                , function (err, config, scrobbles) {
                      if (err)  return cb(err);

                      for (var i = 0; i < scrobbles.length; i += 1) scrobbler(scrobbles[i]);

                      cb(null, config);
                  }
    );
}

exports.getLovedTracks = function (processInfo, loveHandles, cb) {
    var PAGESIZE = 200;

    exports.paged('lovedTracks'
                , 'user.getLovedTracks'
                , {}
                , processInfo
                , PAGESIZE
                , function (js) {
                      return (js && js.lovedtracks) ? js.lovedtracks.track : [];
                  }
                , function (err, config, loved) {
                      if (err)  return cb(err);

                      for (var i = 0; i < loved.length; i += 1) loveHandles(loved[i]);

                      cb(null, config);
                  }
    );
}

exports.getBannedTracks = function (processInfo, hateBreeder, cb) {
    var PAGESIZE = 200;

    exports.paged('bannedTracks'
                , 'user.getBannedTracks'
                , {}
                , processInfo
                , PAGESIZE
                , function (js) {
                      return (js && js.bannedtracks) ? js.bannedtracks.track : [];
                  }
                , function (err, config, banned) {
                      if (err)  return cb(err);

                      for (var i = 0; i < banned.length; i += 1) hateBreeder(banned[i]);

                      cb(null, config);
                  }
    );
}

exports.getInfo = function (processInfo, infoHandler, cb) {
    exports.api('user.getInfo'
              , {}
              , processInfo.auth
              , function (err, resp, body) {
                    if (err)  return cb(err);

                    var js;
                    try {
                        js = JSON.parse(body);
                    }
                    catch (exc) { return cb(exc); }

                    if (js.error) return cb(js.message);

                    infoHandler(js.user);
                    cb();
                }
    );
}
