var fakeweb = require(__dirname + '/fakeweb.js');
var sync = require('../Connectors/github/sync');
var dataStore = require('../Common/node/connector/dataStore');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var fs = require("fs");
var currentDir = process.cwd();
var events = {checkin: 0, contact: 0};
require.paths.push(__dirname + "/../Common/node");
var serviceManager = require("lservicemanager.js");
var suite = RESTeasy.describe("Github Connector");
var utils = require('./test-utils');

process.on('uncaughtException',function(error){
    sys.puts(error.stack);
});

var svcId = "github";
var mePath = '/Me/' + svcId;

var thecollections = ['repos', 'followers', 'following'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("config.json");
var locker = require('../Common/node/locker');
var request = require('request');

var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);
var mongoCollections;

sync.eventEmitter.on('contact/github', function(eventObj) {
    events.contact++;
});

suite.next().suite.addBatch({
    "Can get repos" : {
        topic: function() {
            locker.initClient({lockerUrl:lconfig.lockerBase, workingDirectory:"." + mePath});
            process.chdir('.' + mePath);
            var self = this;
            lmongoclient.connect(function(collections) {
                sync.init({username : 'ctide', accessToken : 'abc'}, collections);
                dataStore.init("id", collections);
                fakeweb.allowNetConnect = false;
                fakeweb.registerUri({
                    uri : 'https://github.com/api/v2/json/repos/show/ctide',
                    file : __dirname + '/fixtures/github/repos.json' });
                sync.syncRepos(self.callback);
            });
        },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 3600);
            assert.equal(diaryEntry, "examined 9 repos, added 9 repos, and modified 0 repos."); },
        "successfully " : {
            topic: function() {
                sync.syncRepos(this.callback) },
            "again" : function(err, repeatAfter, diaryEntry) {
                assert.equal(repeatAfter, 3600);
                assert.equal(diaryEntry, "examined 9 repos, added 0 repos, and modified 0 repos."); }
        }
    }
}).addBatch({
    "Can get followers" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'https://github.com/api/v2/json/user/show/ctide/followers',
                file : __dirname + '/fixtures/github/followers.json' });
            fakeweb.registerUri({
                uri : 'https://github.com/api/v2/json/user/show/fourk',
                file : __dirname + '/fixtures/github/fourk.json' });
            fakeweb.registerUri({
                uri : 'https://github.com/api/v2/json/user/show/smurthas',
                file : __dirname + '/fixtures/github/smurthas.json' });
            sync.syncUsers("followers", this.callback) },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 3600);
            assert.equal(diaryEntry, "examined 2 users, added 2 new users, and modified 0 users.");
        }
    }
}).addBatch({
    "Can get profile" : {
        topic: function() {
            fakeweb.registerUri({
                uri : 'https://github.com/api/v2/json/user/show/ctide',
                file : __dirname + '/fixtures/github/ctide.json' });
            sync.syncProfile(this.callback) },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 3600);
            assert.equal(diaryEntry, "finished updating ctide's profile.")
            assert.equal(err, undefined);
        }
    }
}).addBatch({
    "Can get following" : {
        topic: function() {
            fakeweb.registerUri({
                uri : 'https://github.com/api/v2/json/user/show/ctide/following',
                file : __dirname + '/fixtures/github/following.json' });
            fakeweb.registerUri({
                uri : 'https://github.com/api/v2/json/user/show/wmw',
                file : __dirname + '/fixtures/github/wmw.json' });
            sync.syncUsers("following", this.callback) },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 3600);
            assert.equal(diaryEntry, "examined 1 users, added 1 new users, and modified 0 users.");
        }
    }
}).addBatch({
    "returns the proper response when no new/removed followers" : {
        topic: function() {
            sync.syncUsers("followers", this.callback) },
        "successfully": function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 3600);
            assert.equal(diaryEntry, "examined 2 users, added 0 new users, and modified 0 users.");
        }
    }
}).addBatch({
    "returns the proper response when no new/removed followed users" : {
        topic: function() {
            sync.syncUsers("following", this.callback) },
        "successfully": function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 3600);
            assert.equal(diaryEntry, "examined 1 users, added 0 new users, and modified 0 users.");
        }
    }
}).addBatch({
    "Datastore" : {
        "getFollowersCurrent returns all previously saved followers" : {
            topic: function() {
                dataStore.getAllCurrent("followers", this.callback);
            },
            'successfully': function(err, response) {
                assert.equal(response.length, 2);
                assert.equal(response[0].id, 101964);
                assert.equal(response[0].name, 'James Burkhart');
                assert.equal(response[0].login, 'fourk');
                assert.equal(response[1].id, 399496);
                assert.equal(response[1].name, 'Simon Murtha-Smith');
                assert.equal(response[1].login, 'smurthas');
            }
        },
        "getFollowingCurrent returns all previously saved followed users" : {
            topic: function() {
                dataStore.getAllCurrent("following", this.callback);
            },
            'successfully': function(err, response) {
                assert.equal(response.length, 1);
                assert.equal(response[0].id, 53258);
                assert.equal(response[0].name, 'William M Warnecke');
                assert.equal(response[0].login, 'wmw');
            }
        },        
        "getRepos returns all previously saved repos" : {
            topic: function() {
                dataStore.getAllCurrent("repos", this.callback);
            },
            'successfully': function(err, response) {
                assert.equal(response.length, 9);
                assert.equal(response[0].id, "https://github.com/ctide/arenarecapslibrary");
                assert.equal(response[0].owner, "ctide");
                assert.equal(response[0].name, 'arenarecapslibrary');
            }  
        },
        "getFriendFromCurrent returns the updated friend" : {
            topic: function() {
                dataStore.getCurrent("followers", 101964, this.callback);
            },
            'successfully': function(err, response) {
                assert.equal(response.id, 101964);
                assert.equal(response.name, 'James Burkhart');
                assert.equal(response.login, 'fourk');
                
            }
        }
    }
});

suite.next().suite.addBatch({
    "Handles defollowing properly" : {
        topic: function() {
            fakeweb.registerUri({
                uri : 'https://github.com/api/v2/json/user/show/ctide/followers',
                file : __dirname + '/fixtures/github/less_followers.json' });
            sync.syncUsers("followers", this.callback) },
        'successfully': function(err, repeatAfter, diaryEntry) {
            assert.equal(diaryEntry, 'examined 1 users, added 0 new users, modified 0 users, and removed 1 users.');
        },
        "in the datastore" : {
            "via getPeople" : {
                topic: function() {
                    dataStore.getAllCurrent("followers", this.callback);
                },
                "successfully" : function(err, response) {
                    assert.equal(response.length, 1);
                }
            },
            "via getFriendFromCurrent" : {
                topic: function() {
                    dataStore.getCurrent("followers", 399496, this.callback);
                },
                "successfully" : function(err, response) {
                    assert.equal(response, undefined);
                }
            }
        }
    }
}).addBatch({
    "Handles deleting repos properly" : {
        topic: function() {
            fakeweb.registerUri({
                uri : 'https://github.com/api/v2/json/repos/show/ctide',
                file : __dirname + '/fixtures/github/less_repos.json' });
            sync.syncRepos(this.callback) },
        'successfully': function(err, repeatAfter, diaryEntry) {
            assert.equal(diaryEntry, 'examined 8 repos, added 0 new repos, modified 0 repos, and deleted 1 repos.');
        },
        "in the datastore" : {
            "via getRepos" : {
                topic: function() {
                    dataStore.getAllCurrent("repos", this.callback);
                },
                "successfully" : function(err, response) {
                    assert.equal(response.length, 8);
                }
            },
            "via getRepoFromCurrent" : {
                topic: function() {
                    dataStore.getCurrent("repos", "https://github.com/ctide/arenarecapslibrary", this.callback);
                },
                "successfully" : function(err, response) {
                    assert.equal(response, undefined);
                }
            }
        }
    }
}).addBatch({
    "Tears itself down" : {
        topic: [],
        'after checking for proper number of events': function(topic) {
            // 3 new contact events, 1 deleted conatct events
            assert.equal(events.contact, 4);
        },
        'sucessfully': function(topic) {
            fakeweb.tearDown();
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
})

suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Github connector")
        .discuss("all followers")
            .path(mePath + "/getCurrent/followers")
            .get()
                .expect('returns followers', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 1);
                })
            .unpath()
        .undiscuss()
        .discuss("all followed users")
            .path(mePath + "/getCurrent/following")
            .get()
                .expect('returns following', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 1);
                })
            .unpath()
        .undiscuss()
        .discuss("all repos")
            .path(mePath + "/getCurrent/repos")
            .get()
                .expect('returns repos', function(err, res, body) {
                    assert.isNull(err);
                    var checkins = JSON.parse(body);
                    assert.isNotNull(checkins);
                    assert.equal(checkins.length, 8); 
                })
            .unpath()
        .undiscuss()
        .discuss("get profile")
            .path(mePath + "/get_profile")
            .get()
                .expect("returns the user's profile", function(err, res, body) {
                    assert.isNull(err);
                    var profile = JSON.parse(body);
                    assert.isNotNull(profile);
                    assert.equal(profile.id, 53454); 
                })
            .unpath()
        .undiscuss()      
        
suite.export(module);
