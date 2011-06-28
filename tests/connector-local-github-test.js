var fakeweb = require(__dirname + '/fakeweb.js');
var sync = require('../Connectors/GitHub/sync');
var dataStore = require('../Common/node/connector/dataStore');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var fs = require("fs");
var currentDir = process.cwd();
require.paths.push(__dirname + "/../Common/node");
var serviceManager = require("lservicemanager.js");
var suite = RESTeasy.describe("Github Connector");
var utils = require('./test-utils');

process.on('uncaughtException',function(error){
    sys.puts(error.stack);
});

var svcId = "github";
var mePath = '/Data/' + svcId;

var thecollections = ['repos', 'followers', 'following'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("config.json");
var locker = require('../Common/node/locker');
var levents = require('../Common/node/levents');
var request = require('request');

var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);
var mongoCollections;
var emittedEvents = [];

sync.eventEmitter.on('contact/github', function(eventObj) {
    levents.fireEvent('contact/github', 'github-test', eventObj);
});

suite.next().suite.addBatch({
    "Can sync repos" : {
        topic: function() {
            utils.hijackEvents(['contact/github'], 'github-test');
            utils.eventEmitter.on('event', function(body) { emittedEvents.push(body); });
            
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
                fakeweb.registerUri({
                    uri :'https://github.com/api/v2/json/repos/show/ctide/arenarecapslibrary/watchers',
                    file : __dirname + '/fixtures/github/arenarecapslibrary_watchers.json'});
                fakeweb.registerUri({
                    uri :'https://github.com/api/v2/json/repos/show/ctide/WoWCombatLogParser/watchers',
                    file : __dirname + '/fixtures/github/WoWCombatLogParser_watchers.json'});
                sync.syncRepos(self.callback);
            });
        },
        "and emit proper events" : function(err) {
            assert.equal(emittedEvents[0], '{"obj":{"type":"new","source":"watcher","data":{"repo":"ctide/arenarecapslibrary","login":"ctide"}},"_via":["github-test"]}');
            assert.equal(emittedEvents[1], '{"obj":{"type":"new","source":"watcher","data":{"repo":"ctide/arenarecapslibrary","login":"smurthas"}},"_via":["github-test"]}');
            assert.equal(emittedEvents[2], '{"obj":{"type":"new","source":"watcher","data":{"repo":"ctide/WoWCombatLogParser","login":"ctide"}},"_via":["github-test"]}');
            emittedEvents = [];
        },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 3600);
            assert.equal(diaryEntry, "examined 2 repos, added 2 repos, and modified 0 repos."); },
        "again" : {
            topic: function() {
                sync.syncRepos(this.callback) },
            "successfully" : function(err, repeatAfter, diaryEntry) {
                assert.equal(repeatAfter, 3600);
                assert.equal(diaryEntry, "examined 2 repos, added 0 repos, and modified 0 repos."); }
        }
    }
}).addBatch({
    "Can handle unwatching" : {
        topic: function() {
            fakeweb.registerUri({
                uri :'https://github.com/api/v2/json/repos/show/ctide/arenarecapslibrary/watchers',
                file : __dirname + '/fixtures/github/arenarecapslibrary_watchers-1.json'});
            sync.syncRepos(this.callback);
        },
        "and emit proper events" : function(err) {
            assert.equal(emittedEvents[0], '{"obj":{"type":"delete","source":"watcher","data":{"repo":"ctide/arenarecapslibrary","login":"smurthas"}},"_via":["github-test"]}');
            emittedEvents = [];
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
            sync.syncUsers("followers", this.callback)
        },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 3600);
            assert.equal(diaryEntry, "examined 2 users, added 2 new users, and modified 0 users.");
        },
        "and emit proper events" : function(err) {
            assert.equal(emittedEvents[0], '{"obj":{"source":"followers","type":"add","data":{"gravatar_id":"27e803a71a7774a00d14274def33f92c","company":"Focus.com","name":"James Burkhart","created_at":"2009/07/05 18:16:40 -0700","location":"San Francisco","public_repo_count":4,"public_gist_count":7,"blog":"www.jamesburkhart.com","following_count":8,"id":101964,"type":"User","permission":null,"followers_count":2,"login":"fourk","email":"j@hip.st"}},"_via":["github-test"]}');
            assert.equal(emittedEvents[1], '{"obj":{"source":"followers","type":"add","data":{"gravatar_id":"c0ffbda2aaf58c66407e55f9091acde8","company":null,"name":"Simon Murtha-Smith","created_at":"2010/09/14 15:05:26 -0700","location":"Brooklyn, NY","public_repo_count":4,"public_gist_count":0,"blog":"twitter.com/smurthas","following_count":11,"id":399496,"type":"User","permission":null,"followers_count":8,"login":"smurthas","email":null}},"_via":["github-test"]}');
            assert.equal(emittedEvents[2], undefined);
            emittedEvents = [];
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
        "and emit proper events" : function(err) {
            assert.equal(emittedEvents[0], '{"obj":{"source":"following","type":"add","data":{"gravatar_id":"d0dddbe40b4abde24cd534567bae1039","company":"FifteenB","name":"William M Warnecke","created_at":"2009/02/10 00:10:43 -0800","location":"San Francisco, CA","public_repo_count":8,"public_gist_count":12,"blog":"http://bill.fifteenb.com","following_count":23,"id":53258,"type":"User","permission":null,"followers_count":16,"login":"wmw","email":"bill@fifteenb.com"}},"_via":["github-test"]}');
            assert.equal(emittedEvents[1], undefined);
            emittedEvents = []; },
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
                assert.equal(response.length, 2);
                assert.equal(response[0].id, "ctide/arenarecapslibrary");
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
            fakeweb.registerUri({
                uri :'https://github.com/api/v2/json/repos/show/ctide/WoWCombatLogParser/watchers',
                file : __dirname + '/fixtures/github/WoWCombatLogParser_watchers.json'});
            sync.syncUsers("followers", this.callback) },
        'successfully': function(err, repeatAfter, diaryEntry) {
            assert.equal(diaryEntry, 'examined 1 users, added 0 new users, modified 0 users, and removed 1 users.'); },
        "and emit a delete event" : function(err) {
            assert.equal(emittedEvents[0], '{"obj":{"source":"followers","type":"delete","data":{"id":"smurthas","deleted":true}},"_via":["github-test"]}');
            assert.equal(emittedEvents[1], undefined);
            emittedEvents = []; },
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
            assert.equal(diaryEntry, 'examined 1 repos, added 0 new repos, modified 0 repos, and deleted 1 repos.');
        },
        "in the datastore" : {
            "via getRepos" : {
                topic: function() {
                    dataStore.getAllCurrent("repos", this.callback);
                },
                "successfully" : function(err, response) {
                    assert.equal(response.length, 1);
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
        'after checking no other events were emitted': function(topic) {
            assert.equal(emittedEvents[0], undefined);
        },
        'sucessfully': function(topic) {
            utils.tearDown();
            fakeweb.tearDown();
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
})

suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Github connector")
        .discuss("all followers")
            .path("/Me/" + svcId + "/getCurrent/followers")
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
            .path("/Me/" + svcId + "/getCurrent/following")
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
            .path("/Me/" + svcId + "/getCurrent/repos")
            .get()
                .expect('returns repos', function(err, res, body) {
                    assert.isNull(err);
                    var repos = JSON.parse(body);
                    assert.isNotNull(repos);
                    assert.equal(repos.length, 1); 
                })
            .unpath()
        .undiscuss()
        .discuss("get profile")
            .path("/Me/" + svcId + "/get_profile")
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
