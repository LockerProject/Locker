var GitHubApi = require("github").GitHubApi;
var github = new GitHubApi();

exports.sync = function(processInfo, cb) {
    var auth = processInfo.auth;
    // auth.headers = {"Authorization":"token "+auth.accessToken, "Connection":"keep-alive"};
    github.getUserApi().show(auth.username, function(err, profile) {
        cb(err, {data : {profile : [{obj: profile}]}});
    });
};