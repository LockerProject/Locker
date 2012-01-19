function api(auth, params, cb) {
    var OAuth = require('oauth').OAuth;
    var oa = new OAuth(null
                     , null
                     , auth.consumerKey
                     , auth.consumerSecret
                     , '1.0'
                     , null
                     , 'HMAC-SHA1'
                     , null
                     , {'Accept'     : '*/*'
                      , 'Connection' : 'close'}
    );

    oa.post('http://api.rdio.com/1/'
          , auth.token
          , auth.tokenSecret
          , params
          , null
          , cb
    );
};

function paged(processInfo, synclet, perPage, params, cb) {
    // Using config as a shared namespace requires care -- grab *only* the namespace you
    // need, or race conditions will cause properties to get stomped during simultaneous
    // synclet runs.
    var config = {paging : {}};
    if (processInfo.config && processInfo.config.paging && processInfo.config.paging[synclet]) {
        config.paging[synclet] = processInfo.config.paging[synclet];
    }
    else {
        config.paging[synclet] = {}
    }

    if (!config.paging[synclet].start) config.paging[synclet].start = 0;

    // For some reason, the Rdio API has a hernia if you tell it to start from 0.
    // It helpfully expresses this as a "401 Invalid Signature" error -- thanks, Ian!
    if (0 < config.paging[synclet].start) params.start = config.paging[synclet].start;
    params.count = perPage;

    api(processInfo.auth
      , params
      , function (err, body) {
            if (err) return cb(err);

            var js;
            try {
                js = JSON.parse(body);
            }
            catch (exc) { return cb(exc); }

            if ('error' === js.status) return cb(js.message);

            var objList = js.result;
            if (objList.length < perPage) {
                config.paging[synclet].start = 0;
                config.nextRun = 0;
            }
            else { // still paging
                config.paging[synclet].start += perPage;
                config.nextRun = -1;
            }

            return cb(null, config, objList);
        }
    );
};

exports.getSelf = function (auth, selfHandler, cb) {
    var params = {method : 'currentUser'};

    api(auth
      , params
      , function (err, body) {
            if (err) return cb(err);

            var js;
            try {
                js = JSON.parse(body);
            }
            catch (exc) { return cb(exc); }

            if ('error' === js.status) return cb(js.message);

            selfHandler(js.result);
            cb();
        }
    );
};

exports.getFollowing = function (processInfo, followHandler, cb) {
    var PAGESIZE = 50;

    var params = {method : 'userFollowing'
                , user   : processInfo.auth.rdioId};

    paged(processInfo
        , 'following'
        , PAGESIZE
        , params
        , function (err, config, following) {
              if (err) return cb(err);

              for (var i = 0; i < following.length; i += 1) followHandler(following[i]);

              cb(null, config);
          }
    );
};

exports.getTracksInCollection = function (processInfo, trackHandler, cb) {
    var PAGESIZE = 200; // Make this page larger just because the set is so large.

    var params = {method : 'getTracksInCollection'
                , user   : processInfo.auth.rdioId};

    paged(processInfo
        , 'collection'
        , PAGESIZE
        , params
        , function (err, config, tracks) {
              if (err) return cb(err);

              for (var i = 0; i < tracks.length; i += 1) trackHandler(tracks[i]);

              cb(null, config);
          }
    );
};

// Utility function, needed below.
Array.prototype.diff = function (a) {
    return this.filter(function (i) { return !(a.indexOf(i) > -1); });
};

/*
 * This API call has some perplexing behavior -- it returns a list of... some
 * recent activity on Rdio, along with an ID denoting the last event of the
 * stream. To plumb the depths of the stream, continue making requests with the
 * last_id returned by the call. Unfortunately, last_id continues to be
 * decremented on the server side when calls to getActivityStream are made even
 * after all of the activity has been returned, so it's necessary to track the
 * timestamps of the updates so we know when we're finished (using timestamps
 * because the updates have no independent key of their own).
 *
 * As a side effect of how it works, after the first run, it won't reload old
 * data ever again -- better hope it gets things right the first time!
 */
exports.getActivityStream = function (processInfo, updateHandler, cb) {
    var params = {method : 'getActivityStream'
                , scope  : 'user'
                , user   : processInfo.auth.rdioId};

    var config = {paging : {activity : {}}};
    if (processInfo.config && processInfo.config.paging && processInfo.config.paging.activity) {
        config.paging.activity = processInfo.config.paging.activity;
    }

    if (!config.paging.activity.seen) config.paging.activity.seen = [];
    if (config.paging.activity.lastId) params.last_id = config.paging.activity.lastId;

    api(processInfo.auth
      , params
      , function (err, body) {
            if (err) {
                return cb(err);
            }
            else {
                var js;
                try {
                    js = JSON.parse(body);
                }
                catch (exc) { return cb(exc); }

                if ('error' === js.status) return cb(js.message);

                var updates = {};
                js.result.updates.map(function (u) { updates[u.date] = u; });
                var timestamps = Object.keys(updates);

                var unseen = timestamps.diff(config.paging.activity.seen);
                if (unseen.length === 0) {
                    config.nextRun = 0;
                    config.paging.activity.lastId = 0;
                }
                else {
                    config.nextRun = -1;
                    config.paging.activity.lastId = js.result.last_id;

                    for (var i = 0; i < unseen.length; i += 1) {
                        config.paging.activity.seen.push(updates[unseen[i]].date);
                        updateHandler(updates[unseen[i]]);
                    }
                }

                cb(null, config);
            }
        }
    );
};
