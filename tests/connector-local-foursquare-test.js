var fakeweb = require(__dirname + '/fakeweb.js');
var sync = require('../Connectors/foursquare/sync');
var dataStore = require('../Common/node/ldataStore');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var fs = require("fs");
var currentDir = process.cwd();
var events = {checkin: 0, contact: 0};

var suite = RESTeasy.describe("Foursquare Connector")

process.on('uncaughtException',function(error){
    sys.puts(error.stack);
});

var svcId = "foursquare";
var mePath = '/Me/' + svcId;

var thecollections = ['friends', 'places'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("config.json");

var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);
var mongoCollections;

sync.eventEmitter.on('checkin/foursquare', function() {
    events.checkin++;
});
sync.eventEmitter.on('contact/foursquare', function() {
    events.contact++;
})

suite.next().suite.addBatch({
    "Can get checkins" : {
        topic: function() {
            process.chdir('.' + mePath);
            var self = this;
            lmongoclient.connect(function(collections) {
                console.log("collections", collections);
                sync.init({accessToken : 'abc'}, collections);
                dataStore.init("id", collections);
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
                sync.syncCheckins(self.callback);
            });
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
        "getPeopleCurrent returns all previously saved friends" : {
            topic: function() {
                dataStore.getAllCurrent("friends", this.callback);
            },
            'successfully': function(err, response) {
                assert.equal(response.length, 1);
                assert.equal(response[0].id, 2715557);
                assert.equal(response[0].name, 'Jacob Mitchell');
                assert.equal(response[0].type, 'user');
            }
        },
        "getPlaces returns all previously saved checkins" : {
            topic: function() {
                dataStore.getAllCurrent("places", this.callback);
            },
            'successfully': function(err, response) {
                assert.equal(response.length, 251);
                assert.equal(response[0].id, "4d1dcbf7d7b0b1f7f37bfd9e");
                assert.equal(response[0].venue.name, "Boston Logan International Airport (BOS)");
                assert.equal(response[0].type, 'checkin');
            }  
        },
        "getFriendFromCurrent returns the saved friend" : {
            topic: function() {
                dataStore.getCurrent("friends", '2715557', this.callback);
            },
            'successfully': function(err, response) {
                assert.equal(response.id, 2715557);
                assert.equal(response.name, 'Jacob Mitchell');
                assert.equal(response.type, 'user');
            }
        }
    }
});

suite.next().suite.addBatch({
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
                    dataStore.getAllCurrent("friends", this.callback);
                },
                "successfully" : function(err, response) {
                    assert.equal(response.length, 0);
                }
            },
            "via getFriendFromCurrent" : {
                topic: function() {
                    dataStore.getCurrent("friends", '2715557', this.callback);
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
            assert.equal(events.checkin, 251);
            assert.equal(events.contact, 2);
        },
        'sucessfully': function(topic) {
            fakeweb.tearDown();
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
});

suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Foursquare connector")
        .discuss("all contacts")
            .path(mePath + "/getCurrent/friends")
            .get()
                .expect('returns contacts', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 0);
                })
            .unpath()
        .undiscuss()
        .discuss("all places")
            .path(mePath + "/getCurrent/places")
            .get()
                .expect('returns checkins', function(err, res, body) {
                    assert.isNull(err);
                    var checkins = JSON.parse(body);
                    assert.isNotNull(checkins);
                    assert.equal(checkins.length, 251); 
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
                    assert.equal(profile.id, "18514"); 
                })
            .unpath()
        .undiscuss()      
        
suite.export(module);
