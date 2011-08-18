var GitHubApi = require("github").GitHubApi
  , profile = []
  , repos = []
  , contactWatchers = []
  , github = new GitHubApi()
  , auth
  , ids = {}
  ;

exports.sync = function(processInfo, cb) {
    auth = processInfo.auth;
    exports.syncProfile(function(err) {
        if (err) console.error(err);
        exports.syncRepos(function(err) {
            if (err) console.error(err);
            var responseObj = {data : {}, config: {ids: ids}};
            responseObj.data.profile = [{obj: JSON.parse(profile)}];
            responseObj.data.repos = repos;
            responseObj.data['contact/watchers'] = contactWatchers;
            cb(err, responseObj);
        });
    });
};


exports.syncProfile = function(callback) {
    github.getUserApi().show(auth.username, function(err, user) {
        profile = JSON.stringify(user);
        callback(err);
    })
}


exports.syncRepos = function(callback) {
    var parseRepo = function(data) {
        if (data && data.length) {
            js = data.splice(0, 1)[0];
            // this super sucks, but github doesn't give us an id for repos.  URL is the only thing unique
            //
            js.id = getIDFromUrl(js.url);
            ids[js.id] = [];
            syncWatchers(js.id, function(err, watchers) {
                js.watchers = watchers;
                repos.push({obj: js, type: 'new', timestamp: new Date()});
                for(var i in js.watchers) {
                    contactWatchers.push({obj:{login:js.watchers[i], repo:js.id}});
                    ids[js.id].push(js.watchers[i]);
                }
                parseRepo(data);
            });
        } else {
            return callback();
        }
    };

    function syncWatchers(repoName, callback) {
        github.getRepoApi().getRepoWatchers(auth.username, repoName.substring(repoName.indexOf('/') + 1), callback);
    }

    github.getRepoApi().getUserRepos(auth.username, function(err, repos) {
        if(!err)
            parseRepo(repos);
        else
            callback();
    });
}

function getIDFromUrl(url) {
    if(typeof url !== 'string')
        return url;
    return url.substring(url.lastIndexOf('/', url.lastIndexOf('/') - 1) + 1);
}