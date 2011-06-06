var GitHubApi = require("github").GitHubApi;
var github = new GitHubApi(true);

var fs = require('fs');
var lfs = require('../../Common/node/lfs.js');
var EventEmitter = require('events').EventEmitter;
var locker = require('../../Common/node/locker.js');

exports.createClient = function(username) {
    return new GHClient(username);
}

function GHClient(newAuth) {
    this.auth = newAuth;
    this.username = newAuth.username;
    console.error(this.auth);
    var self = this;
    lfs.readObjectFromFile('profile.json', function(profile) {
        self.profile = profile;
    });
    github.authenticate(this.username, this.auth.access_token);
    return this;
}

GHClient.prototype = new EventEmitter();

GHClient.prototype.syncRepos = function(callback) {
    
}

getNewWatchers = function(username, repoName, knownIDs, callback) {
    github.getRepoApi().getRepoWatchers(self.username, repo, function(err, watchers) {
        if(!err) {
            var newWatchers = [];
            watchers.forEach(function(watcher) {
                if(!knownIDs[watcher.login])
                    newWatchers.push(watcher);
            });
            getUsersInfo(newWatchers, callback);
        }
    });
}


GHClient.prototype.syncWatchersInfo = function(repo, callback) {
    var filePrefix = this.username + '-' + repo;
    var self = this;
    lfs.readObjectFromFile(filePrefix + '-watchersIDs.json', function(watchersIDs) {
        getNewWatchers(self.username, repo, watchersIDs, function(newWatchers) {
            //sync watchers to disk
            lfs.appendObjectsToFile(filePrefix + '-watchers.json', newWatchers);
            //determine which watchers are new, emit events, and sync watchersIDs to disk
            newWatchers.forEach(function(watcher) {
                if(!watchersIDs[watcher.login]) {
                    watchersIDs[watcher.login] = 1;
                    self.emit('new-watcher', {repo:{username:self.username, reponame:repo}, user:watcher});
                }
            });
            lfs.writeObjectToFile(filePrefix + '-watchersIDs.json', watchersIDs);
            if(callback) callback();
        });
    });
}

GHClient.prototype.syncProfile = function(callback) {
    github.getUserApi().show(this.username, function(err, data) {
        if(!err) {
            lfs.writeObjectToFile('profile.json', data);
        }
        callback(err, data);
    });
}

GHClient.prototype.getProfile = function(callback) {
    lfs.readObjectFromFile('profile.json', callback);
}

GHClient.prototype.syncRepos = function(callback) {
    github.getRepoApi().getUserRepos(this.username, function(err, data) {
        if(!err) {
            console.error(data);
            lfs.writeObjectsToFile('repos.json', data);
        }
        callback(err, data);
    });
}

GHClient.prototype.getRepos = function(callback) {
    lfs.readObjectsFromFile('repos.json', callback);
}

var userInfoQueue = [];
function enqueueUserInfoRequest(username) {
    userInfoQueue.push(username)
}