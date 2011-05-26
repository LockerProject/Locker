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
var facebook = require('../Connectors/Facebook/sync');
var dataStore = require('../Connectors/Facebook/dataStore');
var RESTeasy = require('api-easy');
var assert = require('assert');
var vows = require('vows');
var fs = require('fs');
var currentDir = process.cwd();

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

suite.next().suite.addBatch({
    "Can get" : {
        topic: function() {
            process.chdir('.' + mePath);
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
                
            var self = this;
            lmongoclient.connect(function(collections) {
                mongoCollections = collections;
                facebook.init({consumerKey : 'abc', consumerSecret : 'abc', accessToken: 'abc'}, collections);
                dataStore.init(mongoCollections);
                self.callback(); 
            });
        },                            
        "newsfeed": {
            topic: function() {
                facebook.pullStatuses("newsfeed", this.callback); },
            "successfully": function(err, repeatAfter, response) {
                assert.equal(repeatAfter, 60);
                assert.isNull(err);
                assert.equal(response, "synced newsfeed with 1 new entries");
            }
        },
        "wall": {
            topic: function() {
                facebook.pullStatuses("wall", this.callback); },
            "successfully": function(err, repeatAfter, response) {
                assert.equal(repeatAfter, 60);
                assert.isNull(err);
                assert.equal(response, "synced wall with 1 new entries");
            }
        },
        "friends" : {
            topic: function() {
                facebook.syncUsersInfo("friends", this.callback); },
            "successfully": function(err, repeatAfter, response) {
                assert.isNull(err);
                assert.equal(response, "synced 1 new friends");
                assert.equal(repeatAfter, 600);
            }
        }
    }
});

suite.next().suite.addBatch({
    "Datastore function" : {
        "getPeopleCurrent returns ": {
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
        "getLinksCurrent from ": {
            "newsfeed returns" : {
                topic: function() {
                    dataStore.getAllCurrent("home_timeline", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].id.toNumber(), 71348168469643260);
                }
            },
            "wall returns" : {
                topic: function() {
                    dataStore.getAllCurrent("user_timeline", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].id.toNumber(), 73036575310757890);
                }
            }
        }
    }
});

suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Facebook connector")
        .discuss("all current friends")
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
        .discuss("all newsfeed links")
            .path(mePath + "/getCurrent/newsfeed")
            .get()
                .expect('returns newsfeed links', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 3); 
                })
            .unpath()
        .undiscuss()
        .discuss("all wall links")
            .path(mePath + "/getCurrent/wall")
            .get()
                .expect('returns wall links', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 1); 
                })
            .unpath()
        .undiscuss()
        .discuss("get profile")
            .path(mePath + "/getCurrent/profile")
            .get()
                .expect("returns the user's profile", function(err, res, body) {
                    assert.isNull(err);
                    var profile = JSON.parse(body);
                    assert.isNotNull(profile);
                    assert.equal(profile.id, "100002438955325"); 
                })
            .unpath()
        .undiscuss();      
        
suite.export(module);
