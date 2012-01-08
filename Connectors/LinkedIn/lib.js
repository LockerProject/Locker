exports.genericSync = function(type, pather, arrayer) {
    return function(pi, cb) {
        var OAlib = require('oauth').OAuth;
        var OA = new OAlib(null, null, pi.auth.consumerKey, pi.auth.consumerSecret, '1.0', null, 'HMAC-SHA1', null, {'Accept': '*/*', 'Connection': 'close'});
        var path = pather(pi);
        if(!path) return cb(null, {config:pi.config, data:{}}); // nothing to do
        var url = 'http://api.linkedin.com/v1/'+path+'?format=json';
        OA.get(url, pi.auth.token, pi.auth.tokenSecret, function(err, body){
            var js;
            try{ js = JSON.parse(body); }catch(E){ return cb(err); }
            var data = {};
            data[type] = arrayer(pi, js);
            cb(err, {config:pi.config, data: data});
        });
    };
};
