module.exports = {
    handler : function (host, auth, done, req, res) {
        require('fitbit-js')(auth.appKey, auth.appSecret, host + 'auth/fitbit/auth')
            .getAccessToken(req, res, function(err, newToken) {
            if(err) return done(err);
            if(!newToken) return done("token missing");
            auth.token = newToken;
            done(null, auth);
        });
    }
}
