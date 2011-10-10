var GitHubApi = require("github").GitHubApi
  , request = require('request')
  , profile = []
  , repos = []
  // , contactWatchers = []
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
            responseObj.data.repo = repos;
            // responseObj.data['contact/watchers'] = contactWatchers;
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
                getTree(js.id, function(err, tree) {
                    if(!err && tree)
                        js.tree = tree;
                    else {
                        console.error("DEBUG: err", err);
                        console.error("DEBUG: tree", tree);
                    }
                    repos.push({obj: js, type: 'new', timestamp: new Date()});
                    for(var i in js.watchers) {
                        // contactWatchers.push({obj:{login:js.watchers[i], repo:js.id}});
                        ids[js.id].push(js.watchers[i]);
                    }
                    syncRaw(js, function() {
                        parseRepo(data);
                    });
                })
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

function getTree(repo, callback) {
    request.get({uri:"https://api.github.com/repos/" + repo + "/git/trees/HEAD", json:true}, 
    function(err, resp, tree) {
        callback(err, tree);
    });
}


// watchout, WIP

function syncRaw(repo, callback) {
    findApp(repo, function(app) {
        if(app) {
            repo.clonedLocal = true;
            clone(repo.name, repo.url + '.git', callback);
        } else
            callback();
    });
}

function findApp(repo, callback, i) {
    if(!i) i = 0;
    var treei = repo.tree.tree[i];
    if(!treei)
        return callback();
    var path = treei.path;
    if(treei.type === 'blob' && path.indexOf('.app') == path.length - 4) {
        request.get({uri:treei.url, json:true}, function(err, resp, json) {
            console.error("DEBUG: json", json);
            try {
                var app = JSON.parse(new Buffer(json.content, 'base64').toString());
                if(app.title && app.viewer && app.static && app.uses)
                    return callback(app);
            } catch(err) {
                console.error("DEBUG: err", err);
            }
        });
    } else {
        findApp(repo, callback, i+1);
    }
}

var spawn = require('child_process').spawn;

function clone(name, url, callback) {
    var clone = spawn('git', ['clone', url, 'repos/' + name]);
    clone.on('exit', callback);
}