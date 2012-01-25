var contacts = {};
contacts.following = [];
contacts.followers = [];
var auth;
var async = require('async');
var request = require('request');

exports.sync = function(processInfo, cb) {
    auth = processInfo.auth;
    auth.headers = {"Authorization":"token "+auth.accessToken, "Connection":"keep-alive"};
    async.forEachSeries(['following', 'followers'], FoF, function(){
        cb(null, {data: contacts});
    });
};

function FoF(type, cb)
{
    request.get({url:"https://api.github.com/user/"+type, json:true, headers:auth.headers}, function(err, resp, body) {
        if(err || !body || !Array.isArray(body)) return cb(err);
        async.forEachSeries(body, function(user, cb2){
            request.get({url:"https://api.github.com/users/"+user.login, json:true, headers:auth.headers}, function(err, resp, body) {
                if(body) contacts[type].push(body);
                cb2();
            });
        }, cb);
    });
}
