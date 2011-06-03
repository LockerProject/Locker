/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
//testing for the Facebook connector

var fakeweb = require(__dirname + '/fakeweb.js');
var sync = require('../Connectors/facebook/sync');
var dataStore = require('../Common/node/connector/dataStore');
var assert = require('assert');
var RESTeasy = require('api-easy');
var vows = require('vows');
var fs = require('fs');
var currentDir = process.cwd();
var events = {contact: 0};

var utils = require('./test-utils');

var suite = RESTeasy.describe('Facebook Connector');

process.on('uncaughtException',function(error){
    sys.puts(error.stack);
});

var svcId = 'facebook';
var mePath = '/Me/' + svcId;

var thecollections = ['friends', 'newsfeed', 'wall'];
var lconfig = require('../Common/node/lconfig');
lconfig.load('config.json');
var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);
var mongoCollections;
var locker = require('../Common/node/locker');
var request = require('request');

sync.eventEmitter.on('contact/facebook', function(eventObj) {
    events.contact++;
});

suite.next().suite.addBatch({
    "Can setup the tests": {
        topic: function() {
            locker.initClient({lockerUrl:lconfig.lockerBase, workingDirectory:"." + mePath});
            process.chdir('.' + mePath);
            var self = this;
            fakeweb.allowNetConnect = false;
            fakeweb.allowLocalConnect = true;
            lmongoclient.connect(function(collections) {
                sync.init({accessToken : 'abc'}, collections);
                dataStore.init('id', collections);
                self.callback(null, true);
            });
        },
        "successfully": function(err, test) {
            assert.equal(test, true);
        }
    }
}).addBatch({
    "Can get friends" : {
        topic: function() {
            fakeweb.registerUri({
                uri : 'https://graph.facebook.com/me?access_token=abc&date_format=U',
                file : __dirname + '/fixtures/facebook/me.json' });
            fakeweb.registerUri({
                uri : 'https://graph.facebook.com/me/friends?access_token=abc&date_format=U',
                file : __dirname + '/fixtures/facebook/friends.json' });
            fakeweb.registerUri({
                uri : 'https://graph.facebook.com/?ids=1575983201,1199908083,684655824,604699113,103135&access_token=abc&date_format=U',
                file : __dirname + '/fixtures/facebook/ids.json' });
            sync.syncFriends(this.callback);
        },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 3600);
            assert.equal(diaryEntry, "sync'd 5 new friends");
        }
    }
}).addBatch({
    "Can get newsfeed" : {
        topic: function() { 
            fakeweb.registerUri({
                uri : 'https://graph.facebook.com/me?access_token=abc&date_format=U',
                file : __dirname + '/fixtures/facebook/me.json' });
            fakeweb.registerUri({
                uri : 'https://graph.facebook.com/me/home?limit=250&offset=0&access_token=abc&since=1&date_format=U',
                file : __dirname + '/fixtures/facebook/home.json' });
            fakeweb.registerUri({
                uri : 'https://graph.facebook.com/me/home?limit=250&offset=0&access_token=abc&since=1306369954&date_format=U',
                file : __dirname + '/fixtures/facebook/none.json' });
                
            sync.syncNewsfeed(this.callback);
        },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 600);
            assert.equal(diaryEntry, "sync'd 3 new newsfeed posts"); },
        "again" : {
            topic: function() {
                sync.syncNewsfeed(this.callback);
            },
            "successfully" : function(err, repeatAfter, diaryEntry) {
                assert.equal(repeatAfter, 600);
                assert.equal(diaryEntry, "sync'd 0 new newsfeed posts"); 
            }
         }
    }
}).addBatch({
    "Can get wall" : {
            topic: function() {
                fakeweb.allowNetConnect = false;
                fakeweb.registerUri({
                    uri : 'https://graph.facebook.com/me?access_token=abc&date_format=U',
                    file : __dirname + '/fixtures/facebook/me.json' });
                fakeweb.registerUri({
                    uri : 'https://graph.facebook.com/me/feed?limit=250&offset=0&access_token=abc&since=1&date_format=U',
                    file : __dirname + '/fixtures/facebook/feed.json' });
                fakeweb.registerUri({
                    uri : 'https://graph.facebook.com/me/feed?limit=250&offset=0&access_token=abc&since=1306369954&date_format=U',
                    file : __dirname + '/fixtures/facebook/none.json' });
                
                sync.syncWall(this.callback);
            },
            "successfully" : function(err, repeatAfter, diaryEntry) {
                assert.equal(repeatAfter, 600);
                assert.equal(diaryEntry, "sync'd 4 new wall posts"); },
            "again" : {
                topic: function() {
                    sync.syncWall(this.callback);
                },
                "successfully" : function(err, repeatAfter, diaryEntry) {
                    assert.equal(repeatAfter, 600);
                    assert.equal(diaryEntry, "sync'd 0 new wall posts"); }
            }
        }
}).addBatch({
    "Datastore" : {
        "getPeopleCurrent returns all previously saved friends" : {
            topic: function() {
                dataStore.getAllCurrent('friends', this.callback);
            },
            'successfully': function(err, response) {
                assert.isNull(err);
                assert.isNotNull(response);
                assert.equal(response.length, 5);
                assert.equal(response[0].id, 103135);
            }
        },
        "getNewsfeed returns all previously saved newsfeed posts" : {
            topic: function() {
                dataStore.getAllCurrent('newsfeed', this.callback);
            },
            'successfully': function(err, response) {
                assert.isNull(err);
                assert.isNotNull(response);
                assert.equal(response.length, 3);
                assert.equal(response[0].id, '100002438955325_224550747571079');
            }  
        },
        "getWall returns all previously saved wall posts" : {
            topic: function() {
                dataStore.getAllCurrent('wall', this.callback);
            },
            'successfully': function(err, response) {
                assert.isNull(err);
                assert.isNotNull(response);
                assert.equal(response.length, 4);
                assert.equal(response[0].id, "100002438955325_224550747571079");
            }  
        },
        "getFriendFromCurrent returns the saved friend" : {
            topic: function() {
                dataStore.getCurrent('friends', '103135', this.callback);
            },
            'successfully': function(err, response) {
                assert.isNull(err);
                assert.isNotNull(response);
                assert.equal(response.id, 103135);
                assert.equal(response.name, 'Ashley Doe');
            }
        }
    }
}).addBatch({
    "Tears itself down" : {
        topic: [],
        'after checking for proper number of events': function(topic) {
            assert.equal(events.contact, 5);
        },
        'sucessfully': function(topic) {
            fakeweb.tearDown();
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
})

suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Facebook connector")
        .discuss("all contacts")
            .path(mePath + "/getCurrent/friends")
            .get()
                .expect('returns contacts', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 5);
                })
            .unpath()
        .undiscuss()
        .discuss("all newsfeed posts")
            .path(mePath + "/getCurrent/newsfeed")
            .get()
                .expect('returns newsfeed', function(err, res, body) {
                    assert.isNull(err);
                    var newsfeed = JSON.parse(body);
                    assert.isNotNull(newsfeed);
                    assert.equal(newsfeed.length, 3); 
                })
            .unpath()
        .undiscuss()
        .discuss("all wall posts")
            .path(mePath + "/getCurrent/wall")
            .get()
                .expect('returns wall', function(err, res, body) {
                    assert.isNull(err);
                    var wall = JSON.parse(body);
                    assert.isNotNull(wall);
                    assert.equal(wall.length, 4); 
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
                    assert.equal(profile.id, '100002438955325'); 
                })
            .unpath()
        .undiscuss();

        
suite.export(module);