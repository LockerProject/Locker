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

exports.getSelf = function (auth, data_fn, done_fn) {
    var params = {method : 'currentUser'};
    api(auth
      , params
      , function (err, body) {
            if (err) return done_fn(err);

            var js;
            try {
                js = JSON.parse(body);
            }
            catch (E) { return done_fn(err); }

            if ('error' === js.status) done_fn(js.message);

            data_fn(js.result);
            done_fn();
        }
    );
};

exports.getFollowing = function (offset, auth, data_fn, done_fn) {
    var PAGESIZE = 50;
    var params = {method : 'userFollowing'
                , user   : auth.rdioId
                , count  : PAGESIZE};

    // For some reason, the Rdio API has a hernia if you tell it to start from 0.
    // It helpfully expresses this as a "401 Invalid Signature" error -- thanks, Ian!
    if (0 < offset) params.start = offset;

    api(auth
      , params
      , function (err, body) {
            if (err) return done_fn(err);

            var js;
            try {
                js = JSON.parse(body);
            }
            catch (exc) { return done_fn(exc); }

            if ('error' === js.status) done_fn(js.message);

            var following = js.result;
            if (0 < following.length) {
                for (var i = 0; i < following.length; i += 1) data_fn(following[i]);
                if (PAGESIZE > following.length) {
                    exports.getFollowing(offset + PAGESIZE, auth, data_fn, done_fn);
                }
                else {
                    done_fn();
                }
            }
            else {
                done_fn();
            }
        }
    );
}
