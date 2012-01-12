var request = require('request')
  , url     = require('url')
  , path    = require('path')
  , lastfm  = require(path.join(__dirname, 'lib.js'));

/*
 * This function is a one-off because it's neither unauthenticated nor fully authenticated.
 */
function api(method, params, apiKeys, cb) {
    params.method  = method;
    params.api_key = apiKeys.appKey;
    params.api_sig = lastfm.sign(params, apiKeys);
    /* This HAS to go onto the query after it's signed, or signature
       verification will fail. */
    params.format  = 'json';

    // http://ws.audioscrobbler.com/2.0/
    request.get(url.format({protocol : 'http:'
                          , host     : 'ws.audioscrobbler.com'
                          , pathname : '/2.0/'
                          , query    : params})
              , cb);
};

module.exports = {
    handler : function (host, apiKeys, cb, req, res) {
        var cbUrl = host + "auth/lastfm/auth"
          , qs    = url.parse(req.url, true).query;

        // SECOND: http://www.last.fm/api/show/auth.getSession
        if (qs && qs.token) {
            return api('auth.getSession'
                     , {'token' : qs.token}
                     , apiKeys
                     , function (err, resp, body) {
                           if (err) return cb(err);

                           var js;
                           try {
                               js = JSON.parse(body);
                           }
                           catch (exc) { return cb(exc); }

                           if (js.error) {
                               console.error("Last.fm session creation failed: " + js.message);
                               cb(js.message);
                           }
                           else {
                               cb(err
                                , {appKey    : apiKeys.appKey
                                 , appSecret : apiKeys.appSecret
                                 , user      : js.session.name
                                 , sk        : js.session.key});
                           }
                       }
            );
        }

        // FIRST: initiate authentication
        res.redirect('http://www.last.fm/api/auth?api_key=' + apiKeys.appKey + '&cb=' + cbUrl);
    }
};
