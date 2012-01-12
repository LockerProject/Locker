var request = require('request')
  , url     = require('url')
  , crypto  = require('crypto');

/*
 * http://www.last.fm/api/webauth
 */
function sign(query, apiKeys) {
    md5 = crypto.createHash('md5');

    sortStr = ""
    Object.keys(query).sort().forEach(function (key) {
        sortStr += key + query[key];
    });
    sortStr += apiKeys.appSecret;
    md5.update(sortStr);

    return md5.digest('hex');
};

function api(method, params, apiKeys, cb) {
    params.method  = method;
    params.api_key = apiKeys.appKey;
    params.api_sig = sign(params, apiKeys);
    // this HAS to go onto the query outside the signing, or signature verification fails
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
