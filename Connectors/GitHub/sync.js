/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    lfs = require('../../Common/node/lfs.js'),
    request = require('request'),
    dataStore = require('../../Common/node/connector/dataStore'),
    shallowCompare = require('../../Common/node/shallowCompare'),
    app = require('../../Common/node/connector/api');
    EventEmitter = require('events').EventEmitter,
    GitHubApi = require("github").GitHubApi,
    github = new GitHubApi();

    
var updateState, auth, allKnownIDs;

exports.eventEmitter = new EventEmitter();

exports.init = function(theauth, mongoCollections) {
    auth = theauth;
    try {
        allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
    } catch (err) { allKnownIDs = {following:{}, followers:{}, repos:{}}; }    
    dataStore.init("id", mongoCollections);
}

exports.syncRepos = function(callback) {
    var total = 0,
        added = 0,
        deleted = 0,
        modified = 0,
        newIDs = [],
        knownIDs = allKnownIDs["repos"],
        repeatedIDs = {};
        
    var parseRepo = function(data) {
        if (data && data.length) {
            js = data.splice(0, 1)[0];
            // this super sucks, but github doesn't give us an id for repos.  URL is the only thing unique
            //
            js.id = js.url
            dataStore.getCurrent("repos", js.id, function(err, resp) {
                if (resp === undefined) {
                    dataStore.addObject("repos", js, function(err) {
                        added++;
                        parseRepo(data);
                    });
                } else {
                    delete resp['_id'];
                    if (shallowCompare(js, resp)) {
                        parseRepo(data);
                    } else {
                        dataStore.addObject("repos", js, function(err) {
                            modified++;
                            parseRepo(data);
                        });                            
                    }
                }
            })                
        } else {
            if (deleted > 0) {
                return callback(null, 3600, "examined " + total + " repos, added " + added + " new repos, modified " + modified + " repos, and deleted " + deleted + " repos.");
            } else {
                return callback(null, 3600, "examined " + total + " repos, added " + added + " repos, and modified " + modified + " repos.");
            }
        }
    };

    github.getRepoApi().getUserRepos(auth.username, function(err, data) {
        if(!err) {
            if (data) {
                total = data.length;
                data.forEach(function(repo) {
                    if (knownIDs[repo.url])
                        repeatedIDs[repo.url] = 1;
                });
            }

            var removedIDs = [];
            for(var knownID in knownIDs) {
                if(!repeatedIDs[knownID])
                    removedIDs.push(knownID);
            }
            if(removedIDs.length > 0) {
                deleted = removedIDs.length;
                logRemoved("repos", removedIDs, function(err) {
                    parseRepo(data);
                });
            }
            else {
                data.forEach(function(repo) {
                    knownIDs[repo.url] = 1;
                });
                allKnownIDs["repos"] = knownIDs;
                fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
                parseRepo(data);
            }
        }
    });
}

exports.syncUsers = function(friendsOrFollowers, callback) {
    github.getUserApi().show(auth.username, function(err, user) {
        fs.writeFile('profile.json', JSON.stringify(user));
    })
    
    if(!friendsOrFollowers || friendsOrFollowers.toLowerCase() != 'followers')
        friendsOrFollowers = 'following';

    var processData = function(err, data) {
        var newIDs = [];
        var knownIDs = allKnownIDs[friendsOrFollowers];
        var repeatedIDs = {};
        var total = data.length;
        var added = 0;
        var deleted = 0;
        var modified = 0;
        
        var processUser = function(data) {
            if (data && data.length) {
                js = data.splice(0, 1)[0];
                github.getUserApi().show(js, function(err, user) {
                    dataStore.getCurrent(friendsOrFollowers, user.id, function(err, resp) {
                        if (resp === undefined) {
                            dataStore.addObject(friendsOrFollowers, user, function(err) {
                                added++;
                                processUser(data);
                            });
                        } else {
                            delete resp['_id'];
                            if (shallowCompare(user, resp)) {
                                processUser(data);
                            } else {
                                dataStore.addObject(friendsOrFollowers, user, function(err) {
                                    modified++;
                                    processUser(data);
                                })
                            }
                        }
                    })
                });           
            } else {
                if (deleted > 0) {
                    return callback(err, 3600, "examined " + total + " users, added " + added + " new users, modified " + modified + " users, and removed " + deleted + " users.");
                } else {
                    return callback(err, 3600, "examined " + total + " users, added " + added + " new users, and modified " + modified + " users.");
                }
            }
        };
        
        if (data) {
            data.forEach(function(name) {
                if (knownIDs[name])
                    repeatedIDs[name] = 1;
            });
        }
        
        var removedIDs = [];
        for(var knownID in knownIDs) {
            if(!repeatedIDs[knownID])
                removedIDs.push(knownID);
        }
        if(removedIDs.length > 0) {
            deleted = removedIDs.length;
            logRemoved(friendsOrFollowers, removedIDs, function(err) {
                processUser(data);
            });
        }
        else {
            data.forEach(function(name) {
                knownIDs[name] = 1;
            });
            allKnownIDs[friendsOrFollowers] = knownIDs;
            fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
            processUser(data);
        }
        
        
    }
    
    if (friendsOrFollowers === 'following') github.getUserApi().getFollowing(auth.username, function(err, data) {
        processData(err, data);
    });
    if (friendsOrFollowers === 'followers') github.getUserApi().getFollowers(auth.username, function(err, data) {
        processData(err, data);
    });
}

function logRemoved(type, ids, callback) {
    if(!ids || !ids.length) {
        fs.writeFile('allKnownIDs.json', JSON.stringify(allKnownIDs));
        callback();
        return;
    }
    var id = ids.shift();
    if (type !== 'repos') {
        github.getUserApi().show(id, function(err, user) {
            dataStore.removeObject(type, user.id, function(err) {
                delete allKnownIDs[type][id];
                logRemoved(type, ids, callback);
            });
        });
    } else {
        dataStore.removeObject(type, id+'', function(err) {
            delete allKnownIDs[type][id];
            logRemoved(type, ids, callback);
        });
    }
}