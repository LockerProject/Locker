var fakeweb = require(__dirname + '/fakeweb.js');
var sync = require('../Connectors/foursquare/sync');
var dataStore = require('../Connectors/foursquare/dataStore');
var assert = require("assert");
var vows = require("vows");
var fs = require("fs");
var currentDir = process.cwd();
var events = {checkin: 0, contact: 0};

sync.eventEmitter.on('checkin/foursquare', function() {
    events.checkin++;
});
sync.eventEmitter.on('contact/foursquare', function() {
    events.contact++;
})


// figure out if this supports batch setup / teardown, which makes far more sense for this than doing it in each.
// without that, we have to split these into separate batches to ensure a consistent fakeweb state before and after
vows.describe("Foursquare sync").addBatch({
    "Can get checkins" : {
        topic: function() {
            process.chdir('./Me/Foursquare');
            var that = this;
            sync.init({accessToken : 'abc'}, function() {
                fakeweb.allowNetConnect = false;
                fakeweb.registerUri({
                    uri : 'https://api.foursquare.com/v2/users/self/checkins.json?limit=250&offset=0&oauth_token=abc&afterTimestamp=1305252459',
                    body : '{"meta":{"code":200},"response":{"checkins":{"count":1450,"items":[]}}}' });
                fakeweb.registerUri({
                    uri : 'https://api.foursquare.com/v2/users/self.json?oauth_token=abc',
                    file : __dirname + '/fixtures/foursquare/me.json' });
                fakeweb.registerUri({
                    uri : 'https://api.foursquare.com/v2/users/self/checkins.json?limit=250&offset=0&oauth_token=abc&afterTimestamp=1',
                    file : __dirname + '/fixtures/foursquare/checkins_1.json' });
                fakeweb.registerUri({
                    uri : 'https://api.foursquare.com/v2/users/self/checkins.json?limit=250&offset=250&oauth_token=abc&afterTimestamp=1',
                    file : __dirname + '/fixtures/foursquare/checkins_2.json' });
                sync.syncCheckins(that.callback) })
            },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 600);
            assert.equal(diaryEntry, "sync'd 251 new checkins"); },
        "successfully " : {
            topic: function() {
                sync.syncCheckins(this.callback) },
            "again" : function(err, repeatAfter, diaryEntry) {
                assert.equal(repeatAfter, 600);
                assert.equal(diaryEntry, "sync'd 0 new checkins"); }
        }
    }
}).addBatch({
    "Can get friends" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/self.json?oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/me.json' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/self/friends.json?oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/friends.json' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/2715557.json?oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/2715557.json' });
            sync.syncFriends(this.callback) },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 3600);
            assert.equal(diaryEntry, "sync'd 1 new friends");
        }
    }
}).addBatch({
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
}).addBatch({
    "Handles defriending properly" : {
        topic: function() {
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/self/friends.json?oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/no_friends.json' });
            sync.syncFriends(this.callback) },
        'successfully': function(err, repeatAfter, diaryEntry) {
            assert.equal(diaryEntry, 'no new friends, removed 1 deleted friends');
        },
        "in the datastore" : {
            "via getPeople" : {
                topic: function() {
                    dataStore.getPeople(this.callback);
                },
                "successfully" : function(err, response) {
                    assert.equal(response.length, 2);
                    assert.equal(response[0].data.id, 2715557);
                    assert.equal(response[0].data.name, 'Jacob Mitchell');
                    assert.equal(response[0].type, 'add');
                    assert.equal(response[1].data.id, 2715557);
                    assert.equal(response[1].type, 'remove');
                }
            },
            "via getFriendFromCurrent" : {
                topic: function() {
                    dataStore.getFriendFromCurrent(2715557, this.callback);
                },
                "successfully" : function(err, response) {
                    assert.equal(response.length, 0);
                }
            }
        }
    }
}).addBatch({
    "Tears itself down" : {
        topic: [],
        'after checking for proper number of events': function(topic) {
            assert.equal(events.checkin, 251);
            assert.equal(events.contact, 2);
        },
        'sucessfully': function(topic) {
            fakeweb.tearDown();
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
}).export(module);