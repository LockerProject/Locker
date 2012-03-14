var request = require('request')
  , url     = require('url')
  , crypto  = require('crypto');


function is(type, obj) {
  var clas = Object.prototype.toString.call(obj).slice(8, -1);
  return obj !== undefined && obj !== null && clas === type;
}
  
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
};

exports.paged = function (synclet, method, params, processInfo, perPage, extractor, cb) {
    // Using config as a shared namespace requires care -- grab *only* the namespace you
    // need, or race conditions will cause properties to get stomped during simultaneous
    // synclet runs.
  var syncName;
  if (is("Array", synclet)) {
    syncName = synclet[1];
    synclet = synclet[0];
  } else {
    syncName = synclet.toLowerCase();
  }

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

                        var page = config.paging[synclet].page;
                        var totalPages = 0;
                        var totalCount = 0;
                        if (js[syncName] && js[syncName]["@attr"] && js[syncName]["@attr"].totalPages) {
                          totalPages = js[syncName]["@attr"].totalPages;
                          totalCount = js[syncName]["@attr"].total;
                        } else if (js[syncName] && js[syncName].totalPages) {
                          totalPages = js[syncName].totalPages;
                          totalCount = js[syncName].total;
                        } else {
                          console.error("Skipping a misformed page of data");
                          config.paging[synclet].page = page + 1;
                          return cb(null, config, []);
                        }

                        config.paging[synclet].totalPages = totalPages;
                        config.paging[synclet].totalCount = totalCount;

                        var extractedInfo = extractor(js, config.paging[synclet]);
                        var stopPaging = extractedInfo.stopPaging;
                        var objList = extractedInfo.objects;
                        if (page >= totalPages || stopPaging === true) {
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

/*
 * This is pretty bullshitty, but we need *something*, and every track is
 * guaranteed to have a URL.
 */
exports.createId = function (track) {
    if (track.mbid) {
        return track.mbid;
    }
    else {
        var md5 = crypto.createHash('md5');
        md5.update(track.url);
        return md5.digest('hex');
    }
};

exports.getFriends = function (processInfo, friendHandler, cb) {
    var PAGESIZE = 50;

    exports.paged('friends'
                , 'user.getFriends'
                , {}
                , processInfo
                , PAGESIZE
                , function (js) {
                    var ret = {objects:[], stopPaging:false};
                      if (js && js.friends && js.friends.user) {
                        ret.objects = js.friends.user;
                      }
                      return ret;
                  }
                , function (err, config, friends) {
                      if (err)  return cb(err);

                      for (var i = 0; i < friends.length; i += 1) friendHandler(friends[i]);

                      cb(null, config);
                  }
    );
};

exports.getLibrary = function (processInfo, trackHandler, cb) {
    var PAGESIZE = 200;

    exports.paged('tracks'
                , 'library.getTracks'
                , {}
                , processInfo
                , PAGESIZE
                , function (js) {
                      var tracks = (js && js.tracks) ? js.tracks.track : [];
                      return {objects:tracks, stopPaging:false};
                  }
                , function (err, config, tracks) {
                      if (err)  return cb(err);

                      for (var i = 0; i < tracks.length; i += 1) trackHandler(tracks[i]);

                      cb(null, config);
                  }
    );
};

exports.getScrobbles = function (processInfo, params, scrobbler, cb) {
    var PAGESIZE = 200;

    exports.paged(['scrobbles', "recenttracks"]
                , 'user.getRecentTracks'
                , params
                , processInfo
                , PAGESIZE
                , function (js) {
                  var tracks = []
                    if (js && js.recenttracks && js.recenttracks.track) {
                      tracks = js.recenttracks.track;
                    }
                    return {objects:tracks, stopPaging:false};
                  }
                , function (err, config, scrobbles) {
                      if (err)  return cb(err);

                      for (var i = 0; i < scrobbles.length; i += 1) scrobbler(scrobbles[i]);

                      cb(null, config);
                  }
    );
};

exports.getLovedTracks = function (processInfo, loveHandles, cb) {
    var PAGESIZE = 200;

    exports.paged('lovedTracks'
                , 'user.getLovedTracks'
                , {}
                , processInfo
                , PAGESIZE
                , function (js, config) {
                    var tracks = (js && js.lovedtracks && js.lovedtracks.track) ? js.lovedtracks.track : [];
                    var stopPaging = false;
                    if (!config.lastSeen) config.lastSeen = 0;
                    for (var i = 0; i < tracks.length; ++i) {
                      if (parseInt(tracks[i].date.uts) <= config.lastSeen) {
                        stopPaging = true;
                        config.lastSeen = parseInt(Date.now() / 1000);
                        break;
                      }
                    }
                    return {objects:tracks, stopPaging:stopPaging};
                  }
                , function (err, config, loved) {
                      if (err)  return cb(err);

                      // If we're done paging update the lastSeen to current
                      if (config.nextRun >= 0) {
                        config.paging["lovedTracks"].lastSeen = parseInt(Date.now() / 1000);
                      }
                      for (var i = 0; i < loved.length; i += 1) loveHandles(loved[i]);

                      cb(null, config);
                  }
    );
};

exports.getBannedTracks = function (processInfo, hateBreeder, cb) {
    var PAGESIZE = 200;

    exports.paged('bannedTracks'
                , 'user.getBannedTracks'
                , {}
                , processInfo
                , PAGESIZE
                , function (js) {
                      var tracks = (js && js.bannedtracks) ? js.bannedtracks.track : [];
                      return {objects:tracks, stopPaging:false};
                  }
                , function (err, config, banned) {
                      if (err)  return cb(err);

                      for (var i = 0; i < banned.length; i += 1) hateBreeder(banned[i]);

                      cb(null, config);
                  }
    );
};

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
};

exports.getShouts = function (processInfo, shoutListener, cb) {
    var PAGESIZE = 200;

    exports.paged('shouts'
                , 'user.getShouts'
                , {}
                , processInfo
                , PAGESIZE
                , function (js, config) {
                    var shouts = (js && js.shouts) ? js.shouts.shout : [];
                    var stopPaging = false;
                    if (!config.lastSeen) config.lastSeen = 0;
                    for (var i = 0; i < shouts.length; ++i) {
                      if ((Date.parse(shouts[i].date)/1000) <= config.lastSeen) {
                        stopPaging = true;
                        config.lastSeen = parseInt(Date.now() / 1000);
                        break;
                      }
                    }
                    return {objects:shouts, stopPaging:stopPaging};
                  }
                , function (err, config, shouts) {
                      if (err)  return cb(err);

                      if (config.nextRun >= 0) {
                        config.paging["shouts"].lastSeen = parseInt(Date.now() / 1000);
                      }
                      for (var i = 0; i < shouts.length; i += 1) shoutListener(shouts[i]);

                      cb(null, config);
                  }
    );
};
