module.exports = {
    handler : function (host, apiKeys, cb, req, res) {
        var qs      = require('querystring')
          , request = require('request')
          , url     = require('url')
          , cb_url  = host + "auth/rdio/auth"
          , OAuth   = require('oauth').OAuth;
        var oa = new OAuth('http://api.rdio.com/oauth/request_token'
                         , 'http://api.rdio.com/oauth/access_token'
                         , apiKeys.appKey
                         , apiKeys.appSecret
                         , '1.0'
                         , cb_url
                         , 'HMAC-SHA1'
                         , null
                         , {'Accept': '*/*'
                          , 'Connection': 'close'});
        var qs = url.parse(req.url, true).query;

        // second phase, post-user-authorization
        if (qs && qs.oauth_token && req.session.bm_secret) {
            oa.getOAuthAccessToken(qs.oauth_token
                                 , req.session.bm_secret
                                 , qs.oauth_verifier
                                 , function (error, oauth_token, oauth_token_secret, additionalParameters) {
                if (error || !oauth_token) return cb(new Error("OAuth failed to get access token"));

                // Almost every method in the Rdio API requires a user's key, so get it.
                oa.post('http://api.rdio.com/1/'
                      , oauth_token
                      , oauth_token_secret
                      , {method : 'currentUser'}
                      , null
                      , function (err, body) {
                            if (err) return cb(err);

                            var js;
                            try {
                                js = JSON.parse(body);
                            }
                            catch (exc) { return cb(exc); }

                            if ('error' === js.status) {
                                cb(js.message);
                            }
                            else {
                                cb(err
                                 , {consumerKey    : apiKeys.appKey
                                  , consumerSecret : apiKeys.appSecret
                                  , token          : oauth_token
                                  , tokenSecret    : oauth_token_secret
                                  , rdioId         : js.result.key});
                            }
                        }
                );
            });

            return;
        }

        // first phase, initiate user authorization
        oa.getOAuthRequestToken({oauth_callback : cb_url},
                                function (error, oauth_token, oauth_token_secret, oauth_authorize_url, additionalParameters) {
            if (error) return res.end("failed to get token: " + error);
            req.session.bm_secret = oauth_token_secret;
            res.redirect('https://www.rdio.com/oauth/authorize?oauth_token=' + oauth_token);
        });
    }
}
