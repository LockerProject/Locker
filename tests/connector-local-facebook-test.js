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
var dataStore = require('../Common/node/ldataStore');
var assert = require('assert');
var RESTeasy = require('api-easy');
var vows = require('vows');
var fs = require('fs');
var currentDir = process.cwd();
var events = {status: 0, contact: 0};

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

sync.eventEmitter.on('status/facebook', function() {
    events.status++;
});
sync.eventEmitter.on('contact/facebook', function() {
    events.contact++;
});

suite.next().suite.addBatch({
    "Can setup the tests": {
        topic: function() {
            this.callback(null, true);
        },
        "successfully": function(err, test) {
            assert.equal(test, true);
        }
    }
});

suite.next().suite.addBatch({
    "Can get newsfeed" : {
        topic: function() {
            process.chdir('.' + mePath);
            var self = this;
            lmongoclient.connect(function(collections) {
                sync.init({accessToken : 'abc'}, collections);
                dataStore.init("id", collections);
                fakeweb.allowNetConnect = false;
                fakeweb.registerUri({
                    uri : 'https://graph.facebook.com/me?access_token=abc&date_format=U',
                    file : __dirname + '/fixtures/facebook/me.json' });
                fakeweb.registerUri({
                    uri : 'https://graph.facebook.com/me/feed?access_token=abc&date_format=U',
                    file : __dirname + '/fixtures/facebook/feed.json' });
                fakeweb.registerUri({
                    uri : 'https://graph.facebook.com/me/home?limit=250&offset=0&access_token=abc&since=1&date_format=U',
                    file : __dirname + '/fixtures/facebook/home.json' });
                fakeweb.registerUri({
                    uri : 'https://graph.facebook.com/me/home?limit=250&offset=0&access_token=abc&since=1306369954&date_format=U',
                    file : __dirname + '/fixtures/facebook/none.json' });
                    
                sync.syncNewsfeed(self.callback);
            });
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
                assert.equal(diaryEntry, "sync'd 0 new newsfeed posts"); }
        }
    }
}).addBatch({
    "Can get friends" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
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
});

/*
.addBatch({
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
        "getNewsfeed returns all previously saved newsfeed posts" : {
            topic: function() {
                dataStore.getAllCurrent('newsfeed', this.callback);
            },
            'successfully': function(err, response) {
                assert.equal(response.length, 251);
                assert.equal(response[0].id, "4d1dcbf7d7b0b1f7f37bfd9e");
                assert.equal(response[0].venue.name, "Boston Logan International Airport (BOS)");
                assert.equal(response[0].type, 'checkin');
            }  
        },
        "getWall returns all previously saved wall posts" : {
            topic: function() {
                dataStore.getAllCurrent('wall', this.callback);
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
});*/

/*

suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Facebook connector")
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
        .discuss("all newsfeed posts")
            .path(mePath + "/getCurrent/newsfeed")
            .get()
                .expect('returns newsfeed', function(err, res, body) {
                    assert.isNull(err);
                    var newsfeed = JSON.parse(body);
                    assert.isNotNull(newsfeed);
                    assert.equal(newsfeed.length, 251); 
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
                    assert.equal(wall.length, 251); 
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
        .undiscuss();      */

        
suite.export(module);