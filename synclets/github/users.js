var GitHubApi = require("github").GitHubApi
  , contacts = {}
  , ids = {}
  , github = new GitHubApi()
  , auth
  ;

contacts.following = [];
contacts.followers = [];

exports.sync = function(processInfo, cb) {
    ids.following = [];
    ids.followers = [];
    auth = processInfo.auth;
    exports.syncUsers('following', function(err) {
        if (err) console.error(err);
        exports.syncUsers('followers', function(err) {
            if (err) console.error(err);
            var responseObj = {data : {}, config: {id: {followers: ids['followers'], following: ids['followers']}}};
            responseObj.data['contact/followers'] = contacts['followers'];
            responseObj.data['contact/following'] = contacts['following'];
            cb(err, responseObj);
        });
    });
};

exports.syncUsers = function(friendsOrFollowers, callback) {
    if(!friendsOrFollowers || friendsOrFollowers.toLowerCase() != 'followers')
        friendsOrFollowers = 'following';

    var processData = function(err, data) {
        var processUser = function(data) {
            if (data && data.length) {
                js = data.splice(0, 1)[0];
                github.getUserApi().show(js, function(err, user) {
                    if(err) return processUser(data);
                    ids[friendsOrFollowers].push(js);
                    contacts[friendsOrFollowers].push({obj: user, timestamp: Date.now(), type: 'new'});
                    processUser(data);
                });
            } else {
                return callback(err);
            }
        };

        processUser(data);
    }

    if (friendsOrFollowers === 'following') github.getUserApi().getFollowing(auth.username, function(err, data) {
        processData(err, data);
    });
    if (friendsOrFollowers === 'followers') github.getUserApi().getFollowers(auth.username, function(err, data) {
        processData(err, data);
    });
}