var request = require('request');

module.exports = {
    endPoint : 'https://github.com/login/oauth',
    handler : {oauth2 : 'GET'},
    authUrl : 'https://github.com/login/oauth/authorize?&response_type=code'
};

module.exports.authComplete = function(auth, callback) {
    request.get({url:"https://github.com/api/v2/json/user/show?access_token=" + auth.accessToken}, function(err, resp, body) {
        if(err) return callback(err);
        try {
            var resp = JSON.parse(body);
            auth.username = resp.user.login;
            callback(null, auth);
        } catch (e) {
            logger.error('Failed to auth github - ' + body);
            callback(e, auth);
        }
    });
}
