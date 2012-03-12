module.exports = {
    handler : function (host, apiKeys, done, req, res) {
        var qs = require('querystring');
        var request = require('request');
        var url = require('url');
        var callback = host+"auth/linkedin/auth";
        var OAlib = require('oauth').OAuth;
        var OA = new OAlib('https://api.linkedin.com/uas/oauth/requestToken'
         , 'https://api.linkedin.com/uas/oauth/accessToken'
         , apiKeys.appKey
         , apiKeys.appSecret
         , '1.0'
         , callback
         , 'HMAC-SHA1'
         , null
         , {'Accept': '*/*', 'Connection': 'close'});
        var qs = url.parse(req.url, true).query;

        // second phase, post-user-authorization
        if(qs && qs.oauth_token && req.session.token_secret)
        {
            OA.getOAuthAccessToken(qs.oauth_token, req.session.token_secret, qs.oauth_verifier, function (error, oauth_token, oauth_token_secret, additionalParameters) {
                if (error || !oauth_token) return done(new Error("oauth failed to get access token"));
                done(null, {
                    consumerKey : apiKeys.appKey,
                    consumerSecret : apiKeys.appSecret,
                    token : oauth_token,
                    tokenSecret: oauth_token_secret
                });
            });
            return;
        }

        // first phase, initiate user authorization
        OA.getOAuthRequestToken( { oauth_callback: callback }, function (error, oauth_token, oauth_token_secret, oauth_authorize_url, additionalParameters) {
            if(error) return res.end("failed to get token: "+error);
            req.session.token_secret = oauth_token_secret; // stash the secret
            res.redirect('https://www.linkedin.com/uas/oauth/authorize?oauth_token=' + oauth_token);
        });
    }
}
