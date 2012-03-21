module.exports = {
  handler: function(host, apiKeys, done, req, res) {
    var qs = require('querystring');
    var request = require('request');
    var url = require('url');
    var OAlib = require('oauth').OAuth;

    var callbackUrl = host + "auth/withings/auth";

    var OA = new OAlib('https://oauth.withings.com/account/request_token',
      'https://oauth.withings.com/account/access_token',
      apiKeys.appKey,
      apiKeys.appSecret,
      '1.0',
      callbackUrl,
      'HMAC-SHA1',
      null,
      { Accept: '*/*', Connection: 'close' });

    var qs = url.parse(req.url, true).query;

    // Second phase, after user authorization
    if (qs && qs.oauth_token && req.session.token_secret) {
      OA.getOAuthAccessToken(qs.oauth_token, req.session.token_secret, qs.oauth_verifier,
        function(error, oauth_token, oauth_token_secret) {
        if (error || !oauth_token) {
          return done(new Error("oauth failed to get access token"));
        }

        // Note that we're also grabbing and storing
        // the user ID from the queryString
        done(null, {
          consumerKey: apiKeys.appKey,
          consumerSecret: apiKeys.appSecret,
          token: oauth_token,
          tokenSecret: oauth_token_secret,
          userId: qs.userid
        });
      });

      return;
    }

    // First phase, initiate user authorization
    OA.getOAuthRequestToken({ oauth_callback: callbackUrl },
      function(error, oauth_token, oauth_token_secret, oauth_authorize_url) {
      if (error) {
        return res.end("failed to get token: " + error);
      }

      // Stash the secret
      req.session.token_secret = oauth_token_secret;

      res.redirect('https://oauth.withings.com/account/authorize?oauth_token=' + oauth_token + '&oauth_callback=' + callbackUrl);
    });
  }
};
