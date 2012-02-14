var request = require('request')
  , async = require('async')
  , mkdirp = require('mkdirp')
  , fs = require('fs')
  , lockerUrl
  , auth
  ;

exports.sync = function(processInfo, cb) {
    auth = processInfo.auth;
    auth.headers = {"Authorization":"token "+auth.accessToken, "Connection":"keep-alive"};
    var cached = {};
    if (processInfo.config && processInfo.config.cached) cached = processInfo.config.cached;
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
            getWatchers(repo, function(err, resp, watchers) {
                repo.watchers = watchers;
                // now see if it's an app special on isle 9
                getPackage(repo, cb, function(pkg) {
                    // ok, we've got an app, make sure settings are valid
                    getTree(repo, function(err, resp, tree) {
                        if(err || !tree || !tree.tree) return cb();
                        syncRepo(repo, tree.tree, function(err) {
                            if(err) {
                                delete cached[repo.id]; // invalidate the cache, it never sync'd
                                console.error(err);
                                return cb();
                            }
                            // make sure package.json is safe, set some defaults!
                            pkg.repository.handle = repo.id.replace("/", "-").toLowerCase();
                            pkg.name = pkg.repository.handle;
                            pkg.repository.url = 'https://github.com/' + repo.id;
                            if(!pkg.author && auth.profile.name) {
                                pkg.author = {name:auth.profile.name};
                                if(auth.profile.email) pkg.author.email = auth.profile.email;
                            }
                            if(!pkg.version) pkg.version = "0.0.0";
                            if(!pkg.repository.title) pkg.repository.title = repo.name;
                            // XXX: hmmm, these next two if statements should never be true since we only sync the repo
                            // if static == true and type == "app" per line 46 (smurthas)
                            if(!pkg.repository.hasOwnProperty('static')) pkg.repository.static = true;
                            if(!pkg.repository.hasOwnProperty('type')) pkg.repository.type = "app";
                            if(!pkg.repository.hasOwnProperty('update')) pkg.repository.update = "auto";
                            fs.writeFileSync(repo.id+"/package.json", JSON.stringify(pkg)); // overwriting :/
                            request.post({url:lockerUrl+'/map/upsert?manifest=Me/github/'+repo.id+'/package.json'}, function(err, resp) {
                                if(err) console.error(err);
                                // XXX: shouldn't we handle this error!!?! (smurthas)
                                return cb();
                            });
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
    if(typeof url !== 'string') return url;
    return url.substring(url.lastIndexOf('/', url.lastIndexOf('/') - 1) + 1);
}

function getWatchers(repo, callback) {
    request.get({url:"https://api.github.com/repos/"+repo.id+"/watchers", 
                 headers:auth.headers, json:true}, callback);
}

function getPackage(repo, notAppCallback, isAppCallback) {
    request.get({uri: 'https://raw.github.com/'+repo.id+'/HEAD/package.json', 
                 headers:auth.headers},  function(err, resp, pkg) {
        if(resp.statusCode === 404) return notAppCallback();
        try {
            pkg = JSON.parse(pkg);
            if(!isApp(pkg)) return notAppCallback();
        } catch(E) { 
            console.error('for repo ' + repo.id + ', found a package.json, but couldn\'t parse it, or it wasn\'t an app', pkg);
            return notAppCallback();
        } // this is going to be really hard to catch, but what can we do from here to let someone know?
        return isAppCallback(pkg);
    });
}

function getTree(repo, callback) {
    request.get({uri:"https://api.github.com/repos/" + repo.id + "/git/trees/HEAD?recursive=1", 
                 headers:auth.headers, json:true}, callback);
}

function isApp(pkg) {
    var repository = pkg.repository;
    return repository && (repository.static == "true" || repository.static == true) && repository.type == "app";
}

function syncRepo(repo, tree, callback) {
    var existing = {};
    try {
        var oldtree = JSON.parse(fs.readFileSync(repo.id+".tree.json"));
        for(var i in oldtree) existing[oldtree[i].path] = oldtree[i].sha;
    } catch(e) {
        if(e.code !== 'ENOENT') return callback(e);
    }
    // make sure there's at least one tree entry for the repo dir itself
    tree.push({path:".",sha:"na",type:"tree"});
    async.forEachSeries(tree, function(t, cbTree) {
        if(t.type !== "tree") return cbTree();
        if(existing[t.path] === t.sha) return cbTree(); // no changes
        mkdirp(repo.id + "/" + t.path, 0777, function(err) {
            if(err && err.code !== 'EEXIST') return cbTree(err);
            return cbTree();
        });
    }, function(err) {
        // then the blobs
        var errors = [];
        async.forEachSeries(tree, function(treeItem, cb) {
            return saveBlob(treeItem, repo, existing, cb);
        }, function(err) {
            fs.writeFile(repo.id+".tree.json", JSON.stringify(tree), function(err) {
                if(err) errors.push(err);
                return callback(errors.length > 0 ? errors : null);
            });
        });
    });
}

function saveBlob(treeItem, repo, existing, cb) {
    if(treeItem.type !== "blob") return cb();
    if(existing[treeItem.path] === treeItem.sha) return cb(); // no changes
    request.get({uri:'https://raw.github.com/'+repo.id+'/HEAD/'+treeItem.path, 
                 encoding: 'binary', 
                 headers:auth.headers}, 
        function(err, resp, body) {
        if(err || !resp || resp.statusCode !== 200 || body === undefined || body === null) {
            // don't save the sha so it gets retried again
            errors.push(repo.id+": error fetching "+repo.id + "/" + treeItem.path+" status code "+(resp ? resp.statusCode : 0)+" body "+body);
            treeItem.sha = "";
            return cb();
        }
        fs.writeFile(repo.id + "/" + treeItem.path, body, 'binary', cb);
    });
}