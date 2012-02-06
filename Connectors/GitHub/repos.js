var request = require('request')
  , async = require('async')
  , nfs = require('node-fs')
  , fs = require('fs')
  , lockerUrl
  , auth
  ;

exports.sync = function(processInfo, cb) {
    auth = processInfo.auth;
    auth.headers = {"Authorization":"token "+auth.accessToken, "Connection":"keep-alive"};
    var cached = {};
    if (processInfo.config && processInfo.config.cached)
        cached = processInfo.config.cached;
    lockerUrl = processInfo.lockerUrl;
    exports.syncRepos(cached, function(err, repos) {
        if (err) console.error(err);
        var responseObj = {data : {}, config: { cached: cached }};
        responseObj.data.repo = repos;
        cb(err, responseObj);
    });
};

exports.syncRepos = function(cached, callback) {
    request.get({url:"https://api.github.com/user/repos", json:true, headers:auth.headers}, function(err, resp, repos) {
        if(err || !repos || !repos.length) return callback(err, []);
        // process each one to get richer data
        async.forEachSeries(repos, function(repo, cb) {
            repo.idorig = repo.id;
            repo.id = getIDFromUrl(repo.url); // LEGACY UGH, we're overwriting the numeric id, not simple to change now
            // nothing changed
            var ckey = repo.pushed_at + repo.watchers;
            if(cached[repo.id] == ckey) return cb(); // if it hasn't changed!
            cached[repo.id] = ckey;
            // get the watchers, is nice
            // logger.debug("checking "+repo.id);
            request.get({url:"https://api.github.com/repos/"+repo.id+"/watchers", json:true, headers:auth.headers}, function(err, resp, watchers) {
                repo.watchers = watchers;
                // now see if it's an app special on isle 9
                request.get({uri:'https://raw.github.com/'+repo.id+'/HEAD/package.json', headers:auth.headers}, function(err, resp, pkg) {
                    if(err || !pkg) return cb();
                    try {
                        pkg = JSON.parse(pkg);
                    } catch(E) { return cb(); } // this is going to be really hard to catch, but what can we do from here to let someone know? console.error?
                    var repository = pkg.repository;
                    if(!(repository && (repository.static == "true" || repository.static == true) && repository.type == "app")) return cb();
                    // ok, we've got an app, make sure settings are valid
                    request.get({uri:"https://api.github.com/repos/" + repo.id + "/git/trees/HEAD?recursive=1", headers:auth.headers, json:true}, function(err, resp, tree) {
                        if(err || !tree || !tree.tree) return cb();
                        syncRepo(repo, tree.tree, function(err) {
                            // make sure package.json is safe
                            pkg.repository.handle = repo.id.replace("/", "-").toLowerCase();
                            pkg.name = pkg.repository.handle;
                            pkg.repository.url = 'https://github.com/' + repo.id;
                            pkg.repository.author = "myself";
                            if(!pkg.repository.title) pkg.repository.title = repo.name;
                            fs.writeFileSync(repo.id+"/package.json", JSON.stringify(pkg)); // overwriting :/
                            request.post({url:lockerUrl+'/map/upsert?manifest=Me/github/'+repo.id+'/package.json'}, function(err, resp) {
                                if(err) console.error(err);
                                cb();
                            });
                        });
                    })
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

function syncRepo(repo, tree, callback)
{
    var existing = {};
    try {
        var oldtree = JSON.parse(fs.readFileSync(repo.id+".tree.json"));
        for(var i=0; i < oldtree.length; i++)
        {
            existing[oldtree[i].path] = oldtree[i].sha;
        }
    } catch(e){};
    // make sure there's at least one tree entry for the repo dir itself
    tree.push({path:".",sha:"na",type:"tree"});
    async.forEach(tree, function(t, cb){
        if(t.type != "tree") return cb();
        if(existing[t.path] == t.sha) return cb(); // no changes
        nfs.mkdir(repo.id + "/" + t.path, 0777, true, cb);
    }, function(){
        // then the blobs
        async.forEachSeries(tree, function(t, cb){
            if(t.type != "blob") return cb();
            if(existing[t.path] == t.sha) return cb(); // no changes
            request.get({uri:'https://raw.github.com/'+repo.id+'/HEAD/'+t.path, encoding: 'binary', headers:auth.headers}, function(err, resp, body) {
                // logger.debug(resp.statusCode + " for "+ t.path);
                if(err || !resp || resp.statusCode != 200) {t.sha = ""; return cb(); } // don't save the sha so it gets retried again
                if (body) {
                    fs.writeFile(repo.id + "/" + t.path, body, 'binary', cb);
                } else {
                    cb();
                }
            });
        }, function(){
            fs.writeFile(repo.id+".tree.json", JSON.stringify(tree));
            callback();
        });
    });
}
