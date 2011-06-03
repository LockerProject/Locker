var github = require('./lib/github-lib.js');
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
    github.setToken(this.auth.access_token);
    return this;
}

GHClient.prototype = new EventEmitter();

GHClient.prototype.syncRepos = function(callback) {
    
}

GHClient.prototype.syncWatchersInfo = function(repo, callback) {
    var filePrefix = this.username + '-' + repo;
    var self = this;
    lfs.readObjectFromFile(filePrefix + '-watchersIDs.json', function(watchersIDs) {
        github.getNewWatchers(self.username, repo, watchersIDs, function(newWatchers) {
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
    github.getUserInfo(this.username, function(err, data) {
        if(!err) {
            console.error(data);
            lfs.writeObjectToFile('profile.json', data);
            callback(data);
        }
    });
}

GHClient.prototype.getProfile = function(callback) {
    lfs.readObjectFromFile('profile.json', callback);
}

GHClient.prototype.syncRepos = function(callback) {
    github.getRepositories(this.username, function(err, data) {
        if(!err) {
            console.error(data);
            lfs.writeObjectsToFile('repos.json', data);
            callback(data);
        }
    });
}

GHClient.prototype.getRepos = function(callback) {
    lfs.readObjectsFromFile('repos.json', callback);
}

var userInfoQueue = [];
function enqueueUserInfoRequest(username) {
    userInfoQueue.push(username)
}