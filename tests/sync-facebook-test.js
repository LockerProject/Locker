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
                fakeweb.registerUri({
                    uri : 'https://graph.facebook.com/?ids=1575983201,1199908083,684655824,604699113,103135&access_token=abc',
                    file : __dirname + '/fixtures/facebook/ids.json' });
                sync.syncFriends(that.callback); });
            },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 3600);
            assert.equal(diaryEntry, "sync'd 5 new friends"); 
        }
    }
})
.addBatch({
    "Datastore" : {
        "getPeople returns all previously saved friends" : {
            topic: function() {
                var that = this;
                dataStore.init(function() {
                    dataStore.getPeople(that.callback);
                });
            },
            'successfully': function(err, response) {
                assert.equal(response.length, 5);
            }
        },
        "getFriendFromCurrent returns the saved friend" : {
            topic: function() {
                var that = this;
                dataStore.init(function() {
                    dataStore.getFriendFromCurrent(103135, that.callback);
                });
            },
            'successfully': function(err, response) {
                assert.equal(response.length, 1);
            }
        }
    }
})
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