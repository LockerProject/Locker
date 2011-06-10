var fakeweb = require(__dirname + '/fakeweb.js');
var sync = require('../Connectors/foursquare/sync');
var dataStore = require('../Common/node/connector/dataStore');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var fs = require("fs");
var currentDir = process.cwd();
var emittedEvents = [];
require.paths.push(__dirname + "/../Common/node");
var serviceManager = require("lservicemanager.js");
var suite = RESTeasy.describe("Foursquare Connector");
var utils = require('./test-utils');

process.on('uncaughtException',function(error){
    sys.puts(error.stack);
});

var svcId = "foursquare";
var mePath = '/Me/' + svcId;

var thecollections = ['friends', 'places'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("config.json");
var locker = require('../Common/node/locker');
var request = require('request');
var levents = require('../Common/node/levents');

var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);
var mongoCollections;

sync.eventEmitter.on('checkin/foursquare', function(eventObj) {
    levents.fireEvent('checkin/foursquare', 'foursquare-test', eventObj);
});
sync.eventEmitter.on('contact/foursquare', function(eventObj) {
    levents.fireEvent('contact/foursquare', 'foursquare-test', eventObj);
});

suite.next().suite.addBatch({
    "Can get checkins" : {
        topic: function() {
            utils.hijackEvents(['checkin/foursquare','contact/foursquare'], 'foursquare-test');
            utils.eventEmitter.on('event', function(body) { emittedEvents.push(body); });
            
            locker.initClient({lockerUrl:lconfig.lockerBase, workingDirectory:"." + mePath});
            process.chdir('.' + mePath);
            var self = this;
            lmongoclient.connect(function(collections) {
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
                uri : 'https://api.foursquare.com/v2/multi?requests=/users/2715557,/users/18387,&oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/users.json' });
            sync.syncFriends(this.callback) },
        "and emit proper events" : function(err) {
            assert.equal(emittedEvents[0], '{"obj":{"source":"friends","type":"new","data":{"id":"18387","firstName":"William","lastName":"Warnecke","photo":"https://foursquare.com/img/blank_boy.png","gender":"male","homeCity":"San Francisco, CA","relationship":"friend","type":"user","pings":true,"contact":{"email":"lockerproject@sing.ly","twitter":"ww"},"badges":{"count":25},"mayorships":{"count":0,"items":[]},"checkins":{"count":0},"friends":{"count":88,"groups":[{"type":"friends","name":"mutual friends","count":0}]},"following":{"count":13},"tips":{"count":5},"todos":{"count":1},"scores":{"recent":14,"max":90,"checkinsCount":4},"name":"William Warnecke"}},"_via":["foursquare-test"]}');
            assert.equal(emittedEvents[1], '{"obj":{"source":"friends","type":"new","data":{"id":"2715557","firstName":"Jacob","lastName":"Mitchell","photo":"https://foursquare.com/img/blank_boy.png","gender":"male","homeCity":"Frederick, CO","relationship":"friend","type":"user","pings":true,"contact":{"email":"fake@testdata.com"},"badges":{"count":1},"mayorships":{"count":0,"items":[]},"checkins":{"count":1},"friends":{"count":6,"groups":[{"type":"others","name":"other friends","count":6,"items":[]}]},"following":{"count":0},"tips":{"count":0},"todos":{"count":0},"scores":{"recent":0,"max":0,"goal":50,"checkinsCount":0},"name":"Jacob Mitchell"}},"_via":["foursquare-test"]}');
            assert.equal(emittedEvents[2], undefined);
            emittedEvents = []; },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 3600);
            assert.equal(diaryEntry, "Updated 2 friends");
        }
    }
}).addBatch({
    "returns the proper response when no new/removed friends" : {
        topic: function() {
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/multi?requests=/users/2715557,/users/18387,&oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/updated_users.json' });
            sync.syncFriends(this.callback) },
        "successfully": function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 3600);
            assert.equal(diaryEntry, "Updated 2 friends"); },
        "and emit an update event" : function(err) {
            assert.equal(emittedEvents[0], '{"obj":{"source":"friends","type":"update","data":{"id":"2715557","firstName":"Jake","lastName":"Mitchell","photo":"https://foursquare.com/img/blank_boy.png","gender":"male","homeCity":"Frederick, CO","relationship":"friend","type":"user","pings":true,"contact":{"email":"fake@testdata.com"},"badges":{"count":1},"mayorships":{"count":0,"items":[]},"checkins":{"count":1},"friends":{"count":6,"groups":[{"type":"others","name":"other friends","count":6,"items":[]}]},"following":{"count":0},"tips":{"count":0},"todos":{"count":0},"scores":{"recent":0,"max":0,"goal":50,"checkinsCount":0},"name":"Jake Mitchell"}},"_via":["foursquare-test"]}');
            assert.equal(emittedEvents[1], undefined);
            emittedEvents = []; 
        }
    }
}).addBatch({
    "Datastore" : {
        "getPeopleCurrent returns all previously saved friends" : {
            topic: function() {
                dataStore.getAllCurrent("friends", this.callback);
            },
            'successfully': function(err, response) {
                assert.equal(response.length, 2);
                assert.equal(response[0].id, 18387);
                assert.equal(response[0].name, 'William Warnecke');
                assert.equal(response[0].type, 'user');
                assert.equal(response[1].id, 2715557);
                assert.equal(response[1].name, 'Jake Mitchell');
                assert.equal(response[1].type, 'user');
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
        "getFriendFromCurrent returns the updated friend" : {
            topic: function() {
                dataStore.getCurrent("friends", '2715557', this.callback);
            },
            'successfully': function(err, response) {
                assert.equal(response.id, 2715557);
                assert.equal(response.name, 'Jake Mitchell');
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
            assert.equal(diaryEntry, 'Updated 0 existing friends, deleted 2 friends'); },
        "and emits delete events" : function(err) {
            assert.equal(emittedEvents[0], '{"obj":{"source":"friends","type":"delete","data":{"id":"2715557","deleted":true}},"_via":["foursquare-test"]}');
            assert.equal(emittedEvents[1], '{"obj":{"source":"friends","type":"delete","data":{"id":"18387","deleted":true}},"_via":["foursquare-test"]}');
            emittedEvents = []; },
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
        'after ensuring no other events were emitted that we werent prepared for': function(topic) {
            assert.equal(emittedEvents[0], undefined); },
        'sucessfully': function(topic) {
            utils.tearDown();
            fakeweb.tearDown();
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
})

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
