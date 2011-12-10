var GitHubApi = require("github").GitHubApi
  , lconfig = require('../../Common/node/lconfig')
  , logger = require('../../Common/node/logger')
  , request = require('request')
  , github = new GitHubApi()
  , async = require('async')
  , nfs = require('node-fs')
  , fs = require('fs')
  , lockerUrl
  , auth
  , viewers = []
  ;

lconfig.load('../../Config/config.json');

exports.sync = function(processInfo, cb) {
    auth = processInfo.auth;
    auth.headers = {"Authorization":"token "+auth.accessToken, "Connection":"keep-alive"};
    var cached = {};
    if (processInfo.config && processInfo.config.cached)
        cached = processInfo.config.cached;
    lockerUrl = processInfo.lockerUrl;
    exports.syncRepos(cached, function(err, repos) {
        if (err) logger.error(err);
        var responseObj = {data : {}, config: { cached: cached }};
        responseObj.data.repo = repos;
        responseObj.data.view = viewers;
        // logger.debug(viewers);
        cb(err, responseObj);
    });
};

exports.syncRepos = function(cached, callback) {
    github.getRepoApi().getUserRepos(auth.username, function(err, repos) {
        if(err || !repos || !repos.length) return callback(err, []);
        // process each one to get richer data
        async.forEach(repos, function(repo, cb) {
            repo.id = getIDFromUrl(repo.url);
            // nothing changed
            var ckey = repo.pushed_at + repo.watchers;
            if(cached[repo.id] == ckey) return cb();
            cached[repo.id] = ckey;
            // get the watchers, is nice
            // logger.debug("checking "+repo.id);
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
                    // logger.debug("found a viewer! "+repo.id);
                    syncRepo(repo, function(err) {
                        // mangle the manifest so it's a unique handle
                        var manifest = repo.id+"/"+viewer;
                        var js;
                        try {
                            js = JSON.parse(fs.readFileSync(manifest));
                            if(!js || js.static != "true") throw new Error("invalid manifest");
                            js.handle = repo.id.replace("/", "-");
                            js.author = auth.username;
                            fs.writeFileSync(manifest, JSON.stringify(js));
                        } catch (err) {
                            // bail, no viewer for you
                            logger.error("failed: "+err);
                            return cb();
                        }
                        viewers.push({id:repo.id, manifest:manifest, at:repo.pushed_at, viewer:js.viewer});
                        request.post({url:lockerUrl+'/map/upsert?manifest=Me/github/'+manifest}, function(err, resp) {
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
    // make sure there's at least one tree entry for the repo dir itself
    repo.tree.push({path:".",sha:"na",type:"tree"});
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
                request.get({uri:'https://raw.github.com/'+repo.id+'/HEAD/'+t.path, encoding: 'binary', headers:auth.headers}, function(err, resp, body) {
                    // logger.debug(resp.statusCode + " for "+ t.path);
                    if(err || !resp || resp.statusCode != 200) {t.sha = ""; return cb(); } // don't save the sha so it gets retried again
                    fs.writeFile(repo.id + "/" + t.path, body, 'binary', cb);
                });
            },500);
        }, function(){
            fs.writeFile(repo.id+".json", JSON.stringify(repo));
            callback();
        });
    });
}
