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
var fs = require('fs');

process.on('uncaughtException',function(error){
    sys.puts(error.stack);
});

var svcId = "foursquare";
var mePath = '/Data/' + svcId;

var thecollections = ['friends', 'places'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("config.json");
var locker = require('../Common/node/locker');
var request = require('request');
var levents = require('../Common/node/levents');

var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);
var mongoCollections;

var contactEvent1 = fs.readFileSync('fixtures/events/contacts/foursquare_contact_1.json');
var contactEvent2 = fs.readFileSync('fixtures/events/contacts/foursquare_contact_2.json');
var contactEvent3 = fs.readFileSync('fixtures/events/contacts/foursquare_contact_3.json');

sync.eventEmitter.on('checkin/foursquare', function(eventObj) {
    levents.fireEvent('checkin/foursquare', 'foursquare', eventObj);
});
sync.eventEmitter.on('contact/foursquare', function(eventObj) {
    levents.fireEvent('contact/foursquare', 'foursquare', eventObj);
});
sync.eventEmitter.on('photo/foursquare', function(eventObj) {
    levents.fireEvent('photo/foursquare', 'foursquare', eventObj);
})

suite.next().suite.addBatch({
    "Can get checkins" : {
        topic: function() {
            utils.hijackEvents(['checkin/foursquare','contact/foursquare','photo/foursquare'], 'foursquare');
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
                fakeweb.registerUri({
                    uri : 'https://playfoursquare.s3.amazonaws.com/pix/EU5F5YNRMM04QJR0YDMWEHPJ1DYUSTYXOET2BK0YJNFSHSKE.jpg',
                    file : __dirname + '/fixtures/foursquare/EU5F5YNRMM04QJR0YDMWEHPJ1DYUSTYXOET2BK0YJNFSHSKE.jpg' });
                sync.syncCheckins(self.callback);
            });
        },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 600);
            assert.equal(diaryEntry, "sync'd 252 new my checkins"); },
        "generates a ton of checkin events and some photo events" : function(err) {
            assert.equal(emittedEvents.length, 253);
            assert.equal(emittedEvents[0], '{"obj":{"source":"places","type":"new","status":{"id":"4d1dcbf7d7b0b1f7f37bfd9e","createdAt":1293798391,"type":"checkin","timeZone":"America/New_York","venue":{"id":"452113b6f964a520bc3a1fe3","name":"Boston Logan International Airport (BOS)","contact":{"phone":"8002356426","twitter":"BostonLogan"},"location":{"address":"1 Harborside Dr","city":"Boston","state":"MA","postalCode":"02128‎","country":"USA","lat":42.368310452775766,"lng":-71.02154731750488},"categories":[{"id":"4bf58dd8d48988d1ed931735","name":"Airport","pluralName":"Airports","icon":"https://foursquare.com/img/categories/travel/airport.png","parents":["Travel Spots"],"primary":true}],"verified":true,"stats":{"checkinsCount":102160,"usersCount":39715},"todos":{"count":0}},"photos":{"count":0,"items":[]},"comments":{"count":0,"items":[]}}},"_via":["foursquare"]}');
            emittedEvents = [];
        },
        "successfully " : {
            topic: function() {
                sync.syncCheckins(this.callback) },
            "again" : function(err, repeatAfter, diaryEntry) {
                assert.equal(repeatAfter, 600);
                assert.equal(diaryEntry, "sync'd 0 new my checkins"); }
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
            fakeweb.registerUri({
                uri : 'https://playfoursquare.s3.amazonaws.com/userpix_thumbs/UFTTLGSOZMNGZZ3T.png',
                file : __dirname + '/fixtures/foursquare/ctide.png' });
            sync.syncFriends(this.callback) },
        "and emit proper events" : function(err) {
            assert.equal(emittedEvents[0], '{"obj":{"source":"friends","type":"new","data":{"id":"18387","firstName":"William","lastName":"Warnecke","photo":"https://foursquare.com/img/blank_boy.png","gender":"male","homeCity":"San Francisco, CA","relationship":"friend","type":"user","pings":true,"contact":{"email":"lockerproject@sing.ly","twitter":"ww"},"badges":{"count":25},"mayorships":{"count":0,"items":[]},"checkins":{"count":0},"friends":{"count":88,"groups":[{"type":"friends","name":"mutual friends","count":0}]},"following":{"count":13},"tips":{"count":5},"todos":{"count":1},"scores":{"recent":14,"max":90,"checkinsCount":4},"name":"William Warnecke"}},"_via":["foursquare"]}');
            assert.equal(emittedEvents[1], contactEvent1);
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
            assert.equal(emittedEvents[0], contactEvent2);
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
                assert.equal(response.length, 252);
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
                file : __dirname + '/fixtures/foursquare/one_friend.json' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/multi?requests=/users/18387,&oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/final_users.json' });
            sync.syncFriends(this.callback) },
        'successfully': function(err, repeatAfter, diaryEntry) {
            assert.equal(diaryEntry, 'Updated 1 existing friends, deleted 1 friends'); },
        "and emits delete events" : function(err) {
            assert.equal(emittedEvents[0], contactEvent3);
            assert.equal(emittedEvents[1], undefined);
            emittedEvents = []; },
        "in the datastore" : {
            "via getPeople" : {
                topic: function() {
                    dataStore.getAllCurrent("friends", this.callback);
                },
                "successfully" : function(err, response) {
                    assert.equal(response.length, 1);
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
        .discuss("get photo")
            .path("/Me/" + svcId + "/getPhoto/18514")
            .get()
                .expect("returns the user's profile", function(err, res, body) {
                    assert.isNull(err);
                    assert.equal(res.statusCode, 200);
                })
            .unpath()
        .undiscuss()
        .discuss("get checkin photo")
            .path('/Me/' + svcId + '/getPhoto/4e208b75e4cdf685917bee22')
            .get()
                .expect("returns the first photo associated with the checkin", function(err, res, body) {
                    assert.isNull(err);
                    assert.equal(res.statusCode, 200);
                })
            .unpath()
        .undiscuss()
        .discuss("all contacts")
            .path("/Me/" + svcId + "/getCurrent/friends")
            .get()
                .expect('returns contacts', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 1);
                })
            .unpath()
        .undiscuss()
        .discuss("all places")
            .path("/Me/" + svcId + "/getCurrent/places")
            .get()
                .expect('returns checkins', function(err, res, body) {
                    assert.isNull(err);
                    var checkins = JSON.parse(body);
                    assert.isNotNull(checkins);
                    assert.equal(checkins.length, 252);
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
                    assert.equal(profile.id, "18514"); 
                })
            .unpath()
        .undiscuss()      
        
suite.export(module);
