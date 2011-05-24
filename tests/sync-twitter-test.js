var fakeweb = require(__dirname + '/fakeweb.js');
var twitter = require('../Connectors/Twitter/sync');
var dataStore = require('../Connectors/Twitter/dataStore');
var assert = require("assert");
var vows = require("vows");
var fs = require("fs");
var currentDir = process.cwd();



vows.describe("Twitter sync").addBatch({
    "Can get" : {
        topic: function() {
            process.chdir('./Me/Twitter');
            fakeweb.allowNetConnect = false;
            twitter.init({consumerKey : 'abc', consumerSecret : 'abc', token: {'oauth_token' : 'abc', 'oauth_token_secret' : 'abc'}}, this.callback); },
        "home timeline": {
            topic: function() {
                fakeweb.registerUri({
                    uri : "https://api.twitter.com:443/1/statuses/home_timeline.json?count=200&page=1&include_entities=true",
                    file : __dirname + '/fixtures/twitter/home_timeline.js' });
                fakeweb.registerUri({
                    uri : "https://api.twitter.com:443/1/statuses/home_timeline.json?count=200&page=2&include_entities=true&max_id=71348168469643260",
                    body : '[]' });
                twitter.pullStatuses("home_timeline", this.callback); },
            "successfully": function(err, repeatAfter, response) {
                assert.equal(repeatAfter, 60);
                assert.isNull(err);
                assert.equal(response, "synced home_timeline with 1 new entries");
            }
        },
        "mentions" : {
            topic: function() {
                fakeweb.registerUri({
                    uri : 'https://api.twitter.com:443/1/statuses/mentions.json?count=200&page=1&include_entities=true',
                    file : __dirname + '/fixtures/twitter/mentions.js' });
                fakeweb.registerUri({
                    uri : 'https://api.twitter.com:443/1/statuses/mentions.json?count=200&page=2&include_entities=true&max_id=73034804081344510',
                    body : '[]' });
                twitter.pullStatuses("mentions", this.callback); },
            "sucessfully": function(err, repeatAfter, response) {
                assert.equal(repeatAfter, 120);
                assert.isNull(err);
                assert.equal(response, "synced mentions with 1 new entries");
            }
        },
        "user timeline" : {
            topic: function() {
                fakeweb.registerUri({
                    uri : 'https://api.twitter.com:443/1/statuses/user_timeline.json?count=200&page=1&include_entities=true',
                    file : __dirname + '/fixtures/twitter/user_timeline.js' });
                fakeweb.registerUri({
                    uri : 'https://api.twitter.com:443/1/statuses/user_timeline.json?count=200&page=2&include_entities=true&max_id=73036575310757890',
                    body : '[]' });
                twitter.pullStatuses("user_timeline", this.callback); },
            "successfully": function(err, repeatAfter, response) {
                assert.isNull(err);
                assert.equal(repeatAfter, 120);
                assert.equal(response, "synced user_timeline with 1 new entries");
            }
        },
        "friends" : {
            topic: function() {
                fakeweb.registerUri({
                    uri : 'https://api.twitter.com:443/1/account/verify_credentials.json?include_entities=true',
                    file : __dirname + '/fixtures/twitter/verify_credentials.js' });
                fakeweb.registerUri({
                    uri : 'https://api.twitter.com:443/1/friends/ids.json?screen_name=ctide&cursor=-1',
                    body : '{"next_cursor_str":"0","next_cursor":0,"previous_cursor_str":"0","previous_cursor":0,"ids":[1054551]}' });
                fakeweb.registerUri({
                    uri : 'https://api.twitter.com:443/1/users/lookup.json?user_id=1054551%2C&include_entities=true',
                    file : __dirname + '/fixtures/twitter/1054551.js' });
                twitter.syncUsersInfo("friends", this.callback); },
            "successfully": function(err, repeatAfter, response) {
                assert.isNull(err);
                assert.equal(response, "synced 1 new friends");
                assert.equal(repeatAfter, 600);
            }
        },
        "followers" :  {
            topic : function() {
                fakeweb.registerUri({
                    uri : 'https://api.twitter.com:443/1/followers/ids.json?screen_name=ctide&cursor=-1',
                    body : '{"next_cursor_str":"0","next_cursor":0,"previous_cursor_str":"0","previous_cursor":0,"ids":[1054551]}' });
                twitter.syncUsersInfo("followers", this.callback); },
            "successfully": function(err, repeatAfter, response) {
                assert.isNull(err);
                assert.equal(response, "synced 1 new followers");
                assert.equal(repeatAfter, 600);
            }
        }
    }
}).addBatch({
    "Datastore function" : {
        topic : function() {
            dataStore.init(this.callback);
        },
        "getPeople returns" : {
            "followers" : {
                topic: function() {
                    dataStore.getPeople("followers", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].data.id, '1054551');
                }
            },
            "friends" : {
                topic: function() {
                    dataStore.getPeople("friends", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].data.id, '1054551');
                }
            }
        },
        "getAllContacts returns contacts": {
            topic: function() {
                dataStore.getAllContacts(this.callback); },
            "successfully": function(err, response) {
                assert.isNull(err);
                assert.equal(response.friends.length, 1);
                assert.equal(response.followers.length, 1);
                assert.equal(response.friends[0].data.screen_name, response.followers[0].data.screen_name);
            }
        },
        "getPeopleCurrent returns ": {
            "followers" : {
                topic: function() {
                    dataStore.getPeopleCurrent("followers", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].id, '1054551');
                }
            },
            "friends" : {
                topic: function() {
                    dataStore.getPeopleCurrent("friends", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].id, '1054551');
                }
            }
        },
        "getStatuses from ": {
            "home_timeline returns" : {
                topic: function() {
                    dataStore.getStatuses("home_timeline", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].data.id, "71348168469643260");
                }
            },
            "user_timeline returns" : {
                topic: function() {
                    dataStore.getStatuses("user_timeline", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].data.id, "73036575310757890");
                }
            },
            "mentions returns" : {
                topic: function() {
                    dataStore.getStatuses("mentions", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].data.id, "73034804081344510");
                }
            }
        }
    }
}).addBatch({
    "Handles defriending" : {
        topic: function() {
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/friends/ids.json?screen_name=ctide&cursor=-1',
                body : '{"next_cursor_str":"0","next_cursor":0,"previous_cursor_str":"0","previous_cursor":0,"ids":[]}' });
            twitter.syncUsersInfo("friends", this.callback); },
        "successfully": function(err, repeatAfter, response) {
            assert.isNull(err);
            assert.equal(repeatAfter, 600);
            assert.equal(response, "synced 0 new friends");
        },
        "and getPeopleCurrent returns" : {
            topic: function() {
                dataStore.getPeopleCurrent("friends", this.callback); },
            "nothing": function(err, response) {
                assert.isNull(err);
                assert.equal(response.length, 0);
            }
        }
    }
}).addBatch({
    "Tears itself down" : {
        topic: [],
        'sucessfully': function(topic) {
            fakeweb.tearDown();
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
}).export(module);