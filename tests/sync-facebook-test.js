var fakeweb = require(__dirname + '/fakeweb.js');
var sync = require('../Connectors/facebook/sync');
var dataStore = require('../Connectors/facebook/dataStore');
var assert = require("assert");
var vows = require("vows");
var fs = require("fs");
var currentDir = process.cwd();

vows.describe("Facebook sync").addBatch({
    "Can get friends" : {
        topic: function() {
            process.chdir('./Me/facebook');
            var that = this;
            sync.init({accessToken : 'abc'}, function() {
                fakeweb.allowNetConnect = false;
                fakeweb.registerUri({
                    uri : 'https://graph.facebook.com/me?access_token=abc',
                    file : __dirname + '/fixtures/facebook/me.json' });
                fakeweb.registerUri({
                    uri : 'https://graph.facebook.com/me/friends?access_token=abc',
                    file : __dirname + '/fixtures/facebook/me-friends.json' });
                sync.syncFriends(that.callback); });
            },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 3600);
            assert.equal(diaryEntry, "sync'd 5 new friends"); 
        }
    }
})
/*
.addBatch({
    "Datastore" : {
        "getPeople returns all previously saved friends" : {
            topic: function() {
                var that = this;
                dataStore.init(function() {
                    dataStore.getPeople(that.callback);
                })
            },
            'successfully': function(err, response) {
                assert.equal(response.length, 1);
                assert.equal(response[0].data.id, 2715557);
                assert.equal(response[0].data.name, 'Jacob Mitchell');
                assert.equal(response[0].type, 'add');
            }
        },
        "getPlaces returns all previously saved checkins" : {
            topic: function() {
                var that = this;
                dataStore.init(function() {
                    dataStore.getPlaces(that.callback);
                })
            },
            'successfully': function(err, response) {
                assert.equal(response.length, 251);
                assert.equal(response[0].data.id, "4d1dcbf7d7b0b1f7f37bfd9e");
                assert.equal(response[0].data.venue.name, "Boston Logan International Airport (BOS)");
                assert.equal(response[0].type, 'add');
            }  
        },
        "getFriendFromCurrent returns the saved friend" : {
            topic: function() {
                var that = this;
                dataStore.init(function() {
                    dataStore.getFriendFromCurrent(2715557, that.callback);
                })
            },
            'successfully': function(err, response) {
                assert.equal(response.length, 1);
            }
        }
    }
})*/
.addBatch({
    "Tears itself down" : {
        topic: [],
        'sucessfully': function(topic) {
            fakeweb.tearDown();
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
}).export(module);