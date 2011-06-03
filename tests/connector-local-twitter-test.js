var fakeweb = require(__dirname + '/fakeweb.js');
var twitter = require('../Connectors/Twitter/sync');
var dataStore = require('../Common/node/connector/dataStore');
var RESTeasy = require('api-easy');
var assert = require("assert");
var vows = require("vows");
var fs = require("fs");
var currentDir = process.cwd();
var request = require('request');
var locker = require('../Common/node/locker');

var suite = RESTeasy.describe("Twitter Connector")
var utils = require('./test-utils');
process.on('uncaughtException',function(error){
    sys.puts(error.stack);
});

var svcId = "twitter";
var mePath = '/Me/' + svcId;

var thecollections = ['friends', 'followers', 'home_timeline', 'user_timeline', 'mentions'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("config.json");

var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);
var mongoCollections;
var events = 0;

twitter.eventEmitter.on('contact/twitter', function(eventObj) {
    events++;
});

suite.next().suite.addBatch({
    "Can get" : {
        topic: function() {
            locker.initClient({lockerUrl:lconfig.lockerBase, workingDirectory:"." + mePath});
            process.chdir('.' + mePath);
            fakeweb.allowNetConnect = false;
            
            fakeweb.registerUri({
                uri : "https://api.twitter.com:443/1/statuses/home_timeline.json?count=200&page=1&include_entities=true",
                file : __dirname + '/fixtures/twitter/home_timeline.js' });
            fakeweb.registerUri({
                uri : "https://api.twitter.com:443/1/statuses/home_timeline.json?count=200&page=2&include_entities=true&max_id=71348168469643260",
                body : '[]' });
                
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/statuses/mentions.json?count=200&page=1&include_entities=true',
                file : __dirname + '/fixtures/twitter/mentions.js' });
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/statuses/mentions.json?count=200&page=2&include_entities=true&max_id=73034804081344510',
                body : '[]' });
            
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/statuses/user_timeline.json?count=200&page=1&include_entities=true',
                file : __dirname + '/fixtures/twitter/user_timeline.js' });
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/statuses/user_timeline.json?count=200&page=2&include_entities=true&max_id=73036575310757890',
                body : '[]' });
            
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/account/verify_credentials.json?include_entities=true',
                file : __dirname + '/fixtures/twitter/verify_credentials.js' });
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/friends/ids.json?screen_name=ctide&cursor=-1',
                body : '{"next_cursor_str":"0","next_cursor":0,"previous_cursor_str":"0","previous_cursor":0,"ids":[1054551]}' });
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/users/lookup.json?user_id=1054551%2C&include_entities=true',
                file : __dirname + '/fixtures/twitter/1054551.js' });
                
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/followers/ids.json?screen_name=ctide&cursor=-1',
                body : '{"next_cursor_str":"0","next_cursor":0,"previous_cursor_str":"0","previous_cursor":0,"ids":[1054551]}' });
            var self = this;
            lmongoclient.connect(function(collections) {
                mongoCollections = collections;
                twitter.init({consumerKey : 'abc', consumerSecret : 'abc', 
                              token: {'oauth_token' : 'abc', 'oauth_token_secret' : 'abc'}}, collections);
                dataStore.init("id_str", mongoCollections);
                self.callback(); 
            });
        },
                            
        "home timeline": {
            topic: function() {
                twitter.pullStatuses("home_timeline", this.callback); },
            "successfully": function(err, repeatAfter, response) {
                assert.equal(repeatAfter, 60);
                assert.isNull(err);
                assert.equal(response, "synced home_timeline with 1 new entries");
            }
        },
        "mentions" : {
            topic: function() {
                twitter.pullStatuses("mentions", this.callback); },
            "sucessfully": function(err, repeatAfter, response) {
                assert.equal(repeatAfter, 120);
                assert.isNull(err);
                assert.equal(response, "synced mentions with 1 new entries");
            }
        },
        "user timeline" : {
            topic: function() {
                twitter.pullStatuses("user_timeline", this.callback); },
            "successfully": function(err, repeatAfter, response) {
                assert.isNull(err);
                assert.equal(repeatAfter, 120);
                assert.equal(response, "synced user_timeline with 1 new entries");
            }
        },
        "friends" : {
            topic: function() {
                twitter.syncUsersInfo("friends", this.callback); },
            "successfully": function(err, repeatAfter, response) {
                assert.isNull(err);
                assert.equal(response, "synced 1 new friends");
                assert.equal(repeatAfter, 600);
            }
        },
        "followers" :  {
            topic : function() {
                twitter.syncUsersInfo("followers", this.callback); },
            "successfully": function(err, repeatAfter, response) {
                assert.isNull(err);
                assert.equal(response, "synced 1 new followers");
                assert.equal(repeatAfter, 600);
            }
        }
    }
});

suite.next().suite.addBatch({
    "Datastore function" : {
        "getPeopleCurrent returns ": {
            "followers" : {
                topic: function() {
                    dataStore.getAllCurrent("followers", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].id, '1054551');
                }
            },
            "friends" : {
                topic: function() {
                    dataStore.getAllCurrent("friends", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].id, '1054551');
                }
            }
        },
        "getStatusesCurrent from ": {
            "home_timeline returns" : {
                topic: function() {
                    dataStore.getAllCurrent("home_timeline", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].id.toNumber(), 71348168469643260);
                }
            },
            "user_timeline returns" : {
                topic: function() {
                    dataStore.getAllCurrent("user_timeline", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].id.toNumber(), 73036575310757890);
                }
            },
            "mentions returns" : {
                topic: function() {
                    dataStore.getAllCurrent("mentions", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].id.toNumber(), 73034804081344510);
                }
            }
        }
    }
});

suite.next().suite.addBatch({
    "Handles defriending" : {
        topic: function() {
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/friends/ids.json?screen_name=ctide&cursor=-1',
                body : '{"next_cursor_str":"0","next_cursor":0,"previous_cursor_str":"0","previous_cursor":0,"ids":[]}' });
            twitter.syncUsersInfo("friends", this.callback); },
        "successfully": function(err, repeatAfter, response) {
            assert.isNull(err);
            assert.equal(repeatAfter, 600);
            assert.equal(response, "removed 1 friends");
        },
        "and getPeopleCurrent returns" : {
            topic: function() {
                dataStore.getAllCurrent("friends", this.callback); },
            "nothing": function(err, response) {
                assert.isNull(err);
                assert.equal(response.length, 0);
            }
        }
    }
}).addBatch({
    "Tears itself down" : {
        topic: [],
        'after checking for proper number of events': function(topic) {
            assert.equal(events, 3);
        },
        'sucessfully': function(topic) {
            fakeweb.tearDown();
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
})


suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Twitter connector")
        .discuss("all current friends")
            .path(mePath + "/getCurrent/friends")
            .get()
                .expect('returns nothing', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 0); 
                })
            .unpath()
        .undiscuss()
        .discuss("all current followers")
            .path(mePath + "/getCurrent/followers")
            .get()
                .expect('returns one follower', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 1);
                    assert.equal(contacts[0].id, 1054551);
                })
            .unpath()
        .undiscuss()
        .discuss("all home_timeline updates")
            .path(mePath + "/getCurrent/home_timeline")
            .get()
                .expect('returns status updates', function(err, res, body) {
                    assert.isNull(err);
                    var statuses = JSON.parse(body);
                    assert.isNotNull(statuses);
                    assert.equal(statuses.length, 1); 
                    assert.equal(statuses[0].id, 71348168469643260);
                })
            .unpath()
        .undiscuss()
        .discuss("all mentions updates")
            .path(mePath + "/getCurrent/mentions")
            .get()
                .expect('returns status updates', function(err, res, body) {
                    assert.isNull(err);
                    var statuses = JSON.parse(body);
                    assert.isNotNull(statuses);
                    assert.equal(statuses.length, 1); 
                    assert.equal(statuses[0].id, 73034804081344510);
                })
            .unpath()
        .undiscuss()
        .discuss("all user_timeline updates")
            .path(mePath + "/getCurrent/user_timeline")
            .get()
                .expect('returns status updates', function(err, res, body) {
                    assert.isNull(err);
                    var statuses = JSON.parse(body);
                    assert.isNotNull(statuses);
                    assert.equal(statuses.length, 1); 
                    assert.equal(statuses[0].id, 73036575310757890);
                })
            .unpath()
        .undiscuss()   


suite.export(module);