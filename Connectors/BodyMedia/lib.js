var OAlib = require('oauth').OAuth;

exports.genericSync = function(type, pather, arrayer) {
    return function f(pi, cb, flag) {
        var path = pather(pi);
        if(!path) return cb(null, {config:pi.config, data:{}}); // nothing to do
        var url = 'http://api.bodymedia.com/v2/json/'+path+'?api_key='+pi.auth.consumerKey;
        var OA = new OAlib(null, 'https://api.bodymedia.com/oauth/access_token?api_key='+pi.auth.consumerKey, pi.auth.consumerKey, pi.auth.consumerSecret, '1.0', null, 'HMAC-SHA1', null, {'Accept': '*/*', 'Connection': 'close'});
        OA.get(url, pi.auth.token, pi.auth.tokenSecret, function(err, body){
            if(err && err.statusCode == 401 && !flag) return refreshToken(OA, f, pi, cb);
            try{ var js = JSON.parse(body); }catch(E){ return cb(err); }
            var data = {};
            data[type] = arrayer(pi, js);
            cb(err, {config:pi.config, data: data});
        });
    };
};

function refreshToken(oauth, f, pi, cb)
{
    oauth.getOAuthAccessToken(pi.auth.token, pi.auth.tokenSecret, function (error, oauth_token, oauth_token_secret, additionalParameters) {
        if (error || !oauth_token) return cb("oauth failed to refresh expired token: "+error);
        pi.auth.token = oauth_token;
        pi.auth.tokenSecret = oauth_token_secret;
        f(pi, cb, true);
    });
}