var request = require('request');

exports.sync = function(pi, cb) {
    request.get({url:"https://api.github.com/user?access_token=" + pi.auth.accessToken, json:true}, function(err, resp, body) {
        if(err || !body) return cb(err);
        pi.auth.profile = body;
        cb(null, {auth: pi.auth, data: {profile: [body]}});
    });
};