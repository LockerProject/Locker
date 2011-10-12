var GitHubApi = require("github").GitHubApi
  , request = require('request')
  , github = new GitHubApi()
  , async = require('async')
  , nfs = require('node-fs')
  , fs = require('fs')
  , lockerUrl
  , auth
  , viewers = []
  ;

exports.sync = function(processInfo, cb) {
    auth = processInfo.auth;
    auth.headers = {"Authorization":"token "+auth.accessToken, "Connection":"keep-alive"};
    lockerUrl = processInfo.lockerUrl;
    github.getUserApi().show(auth.username, function(err, profile) {
        if (err) console.error(err);
        exports.syncRepos(function(err, repos) {
            if (err) console.error(err);
            var responseObj = {data : {}, config: {}};
            responseObj.data.profile = [{obj: profile}];
            responseObj.data.repo = repos;
            responseObj.data.view = viewers;
            console.error(viewers);
            cb(err, responseObj);
        });
    });
};

exports.syncRepos = function(callback) {
    github.getRepoApi().getUserRepos(auth.username, function(err, repos) {
        if(err || !repos || !repos.length) return callback(err, []);
        // process each one to get richer data
        async.forEachSeries(repos, function(repo, cb){
            repo.id = getIDFromUrl(repo.url);
            // get the watchers, is nice
            console.error("checking "+repo.id);
            github.getRepoApi().getRepoWatchers(auth.username, repo.id.substring(repo.id.indexOf('/') + 1), function(err, watchers){
                repo.watchers = watchers;
                // get a snapshot of the full repo, is nice too
                request.get({uri:"https://api.github.com/repos/" + repo.id + "/git/trees/HEAD?recursive=1", headers:auth.headers, json:true}, function(err, resp, tree) {
                    if(err || !tree || !tree.tree) return cb(err);
                    repo.tree = tree.tree;
                    // see if there's any viewers!
                    var viewer = false;
                    for(var i=0; i < repo.tree.length; i++) if(/^\w+\.app$/.test(repo.tree[i].path)) viewer = repo.tree[i].path;
                    if(!viewer) return cb();
                    console.error("found a viewer! "+repo.id);
                    syncRepo(repo, function(err) {
                        // mangle the manifest so it's a unique handle
                        var manifest = repo.id+"/"+viewer;
                        var js;
                        try {
                            js = JSON.parse(fs.readFileSync(manifest));
                            js.handle = repo.id.replace("/", "-");
                            js.author = auth.username;
                            fs.writeFileSync(manifest, JSON.stringify(js));
                        } catch (err) {
                            // bail, no viewer for you
                            console.error("failed: "+err);
                            return cb();
                        }
                        viewers.push({id:repo.id, manifest:manifest, at:repo.pushed_at, viewer:js.viewer});
                        request.get({url:lockerUrl+'/map/upsert?manifest=Me/github/'+manifest}, function(err, resp) {
                            cb();
                        });
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

function syncRepo(repo, callback)
{
    var existing = {};
    try {
        var js = JSON.parse(fs.readFileSync(repo.id+".json"));
        for(var i=0; i < js.tree.length; i++)
        {
            existing[js.tree[i].path] = js.tree[i].sha;
        }
    } catch(e){};
    fs.writeFile(repo.id+".json", JSON.stringify(repo));
    async.forEach(repo.tree, function(t, cb){
        if(t.type != "tree") return cb();
        if(existing[t.path] == t.sha) return cb(); // no changes
        nfs.mkdir(repo.id + "/" + t.path, 0777, true, cb);
    }, function(){
        // then the blobs
        async.forEachSeries(repo.tree, function(t, cb){
            if(t.type != "blob") return cb();
            if(existing[t.path] == t.sha) return cb(); // no changes
            setTimeout(function(){
                request.get({uri:'http://raw.github.com/'+repo.id+'/HEAD/'+t.path, encoding: 'binary', headers:auth.headers}, function(err, resp, body) {
                    console.error(resp.statusCode + " for "+ t.path);
                    if(err || !resp || resp.statusCode != 200) return cb();
                    fs.writeFile(repo.id + "/" + t.path, body, 'binary', cb);
                });
            },500);
        }, callback);
    });
}