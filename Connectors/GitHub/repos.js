var GitHubApi = require("github").GitHubApi
  , request = require('request')
  , github = new GitHubApi()
  , async = require('async')
  , nfs = require('node-fs')
  , fs = require('fs')
  , auth
  ;

exports.sync = function(processInfo, cb) {
    auth = processInfo.auth;
    github.getUserApi().show(auth.username, function(err, profile) {
        if (err) console.error(err);
        exports.syncRepos(function(err, repos) {
            if (err) console.error(err);
            var responseObj = {data : {}, config: {}};
            responseObj.data.profile = [{obj: profile}];
            responseObj.data.repo = repos;
            cb(err, responseObj);
        });
    });
};

exports.syncRepos = function(callback) {
    github.getRepoApi().getUserRepos(auth.username, function(err, repos) {
        if(err || !repos || !repos.length) return callback(err, []);
        async.forEachSeries(repos, function(repo, cb){
            repo.id = getIDFromUrl(repo.url);
            // get the watchers, is nice
            console.error("syncing "+repo.id);
            github.getRepoApi().getRepoWatchers(auth.username, repo.id.substring(repo.id.indexOf('/') + 1), function(err, watchers){
                repo.watchers = watchers;
                // try syncing the whole thing! prty dmb 4 now
                request.get({uri:"https://api.github.com/repos/" + repo.id + "/git/trees/HEAD?recursive=1", json:true}, function(err, resp, tree) {
                    if(err || !tree || !tree.tree) return cb(err);
                    // first the dirs
                    async.forEach(tree.tree, function(t, cb2){
                        if(t.type != "tree") return cb2();
                        nfs.mkdir(repo.id + "/" + t.path, 0777, true, cb2);
                    }, function(){
                        // then the blobs
                        async.forEach(tree.tree, function(t, cb2){
                            if(t.type != "blob") return cb2();
                            console.error("FETCHING "+'http://raw.github.com/'+repo.id+'/HEAD/'+t.path);
                            request.get({uri:'http://raw.github.com/'+repo.id+'/HEAD/'+t.path, encoding: 'binary'}, function(err, resp, body) {
                                if(err) return cb2();
                                console.error("got "+resp.statusCode+" for "+t.path);
                                fs.writeFile(repo.id + "/" + t.path, body, 'binary', cb2);
                            });
                        }, cb);
                    });
                });
            });
        }, function(err){
            callback(err, repos);
        });
    });
}

function getIDFromUrl(url) {
    if(typeof url !== 'string')
        return url;
    return url.substring(url.lastIndexOf('/', url.lastIndexOf('/') - 1) + 1);
}
