var github = require('./github-lib.js');
var fs = require('fs');
var lfs = require('../../Common/node/lfs.js');
var EventEmitter = require('events').EventEmitter;
var locker = require('../../Common/node/locker.js');

exports.createClient = function(username) {
    return new GHClient(username);
}



function GHClient(username) {
    this.username = username;
    return this;
}

GHClient.prototype = new EventEmitter();

GHClient.prototype.syncWatchersInfo = function(repo, callback) {
    console.log(this.username);
    var self = this;
    lfs.readObjectFromFile('repo-' + repo + '-watchersIDs.json', function(watchersIDs) {
        console.log(watchersIDs);
        github.getNewWatchers(self.username, repo, watchersIDs, function(newWatchers) {
            //sync watchers to disk
            lfs.appendObjectsToFile(self.username + '-' + repo + '-watchers.json', newWatchers);
            //determine which watchers are new, emit events, and sync watchersIDs to disk
            lfs.readObjectFromFile(self.username + '-' + repo + '-watchersIDs.json', function(watchersIDs) {
                newWatchers.forEach(function(watcher) {
                    if(!watchersIDs[watcher.login]) {
                        watchersIDs[watcher.login] = true;
                        self.emit('new-watcher', {repo:{username:self.username, reponame:repo}, user:watcher});
                        //emit event
                    }
                });
                lfs.writeObjectToFile('repo-' + repo + '-watchersIDs.json', watchersIDs);
                if(callback) callback();
            });
        });
    });
}

GHClient.prototype.syncProfile = function(callback) {
    github.getUserInfo(this.username, function(err, data) {
        if(!err) {
            lfs.writeObjectToFile('profile.json', data);
            callback();
        }
    });
}

GHClient.prototype.getProfile = function(callback) {
    lfs.readObjectFromFile('profile.json', callback);
}

var userInfoQueue = [];
function enqueueUserInfoRequest(username) {
    userInfoQueue.push(username)
}