module.exports = {
  handler : function (host, apiKeys, done, req, res) {
    var client = require('flickr-js')(apiKeys.appKey, apiKeys.appSecret);
    var frob = req.param('frob');

    if (!frob) { // starting out
      res.send('<script> window.location = "' + client.getAuthURL('read') + '"</script>');
    }
    else { // finishing
      client.getTokenFromFrob(frob, function (err, auth) {
        if (err) return done(err);
        if (!auth) return done(new Error("token missing"));

        auth.apiKey = apiKeys.appKey;
        auth.apiSecret = apiKeys.appSecret;
        done(null, auth);
      });
    }
  }
};
