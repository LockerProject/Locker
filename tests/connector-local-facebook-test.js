/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
//testing for the Facebook connector

var mongoCollections;
var currentDir = process.cwd();
var svcId = 'facebook';
var mePath = '/Data/' + svcId;
var thecollections = ['friends', 'newsfeed', 'wall'];
process.on('uncaughtException',function(error){
    sys.puts(error.stack);
});
require.paths.push(__dirname + "/Common/node");

var fakeweb = require(__dirname + '/fakeweb.js');
var sync = require('../Connectors/Facebook/sync');
var dataStore = require('../Common/node/connector/dataStore');
var assert = require('assert');
var RESTeasy = require('api-easy');
var suite = RESTeasy.describe('Facebook Connector');
var vows = require('vows');
var lconfig = require('../Common/node/lconfig');
lconfig.load('config.json');
var utils = require('./test-utils');
var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);
var locker = require('../Common/node/locker');
var levents = require('../Common/node/levents');
var emittedEvents = [];
var fs = require('fs');

sync.eventEmitter.on('contact/facebook', function(eventObj) {
    levents.fireEvent('contact/facebook', 'facebook-test', "new", eventObj);
});

sync.eventEmitter.on('link/facebook', function(eventObj) {
    levents.fireEvent('link/facebook', 'facebook-test', "new", eventObj);
});

suite.next().suite.addBatch({
    "Can setup the tests": {
        topic: function() {
            utils.hijackEvents(['link/facebook','contact/facebook'], 'facebook-test');
            utils.eventEmitter.on('event', function(body) {
                var obj = JSON.parse(body);
                // We need to hide the timestamp, it's too hard to test
                delete obj.timestamp;
                emittedEvents.push(obj);
            });
            locker.initClient({lockerUrl:lconfig.lockerBase, workingDirectory:"." + mePath});
            process.chdir('.' + mePath);
            var self = this;
            fakeweb.allowNetConnect = false;
            fakeweb.allowLocalConnect = true;
            lmongoclient.connect(function(mongo) {
                sync.init({accessToken : 'abc'}, mongo);
                dataStore.init('id', mongo);
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
                uri : 'https://graph.facebook.com/100002438955325/picture?access_token=abc',
                file : __dirname + '/fixtures/facebook/photo.gif',
                contentType : 'image/gif' });
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
        },
        "and emit correct events": function(err) {
            assert.deepEqual(emittedEvents[0], {"obj":{"source":"friends","type":"new","data":{"id":"103135","name":"Ashley Doe","first_name":"Ashley","last_name":"Doe","link":"http://www.facebook.com/profile.php?id=103135","gender":"female","locale":"en_US","updated_time":"2011-05-24T05:27:17+0000"}},"via":"facebook-test","action":"new","type":"contact/facebook"});
            assert.deepEqual(emittedEvents[1], {"obj":{"source":"friends","type":"new","data":{"id":"604699113","name":"Jose Doe","first_name":"Jose","last_name":"Doe","link":"http://www.facebook.com/profile.php?id=604699113","username":"jackswords","gender":"male","locale":"en_US","updated_time":"2011-05-19T05:17:02+0000"}},"via":"facebook-test","action":"new","type":"contact/facebook"});
            assert.deepEqual(emittedEvents[2], {"obj":{"source":"friends","type":"new","data":{"id":"684655824","name":"Brooke Doe","first_name":"Brooke","last_name":"Doe","link":"http://www.facebook.com/profile.php?id=684655824","gender":"female","locale":"en_US","updated_time":"2011-05-20T20:50:27+0000"}},"via":"facebook-test","action":"new","type":"contact/facebook"});
            assert.deepEqual(emittedEvents[3], {"obj":{"source":"friends","type":"new","data":{"id":"1199908083","name":"Joe Doe","first_name":"Joe","last_name":"Doe","link":"http://www.facebook.com/profile.php?id=1199908083","gender":"male","locale":"en_US","updated_time":"2011-05-22T19:56:05+0000"}},"via":"facebook-test","action":"new","type":"contact/facebook"});
            assert.deepEqual(emittedEvents[4], {"obj":{"source":"friends","type":"new","data":{"id":"1575983201","name":"Nate Doe","first_name":"Nate","last_name":"Doe","link":"http://www.facebook.com/profile.php?id=1575983201","gender":"male","locale":"en_US","updated_time":"2011-05-23T20:35:32+0000"}},"via":"facebook-test","action":"new","type":"contact/facebook"});
            assert.equal(undefined, emittedEvents[5]);
            emittedEvents = [];
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
        "and emit correct events" : function() {
            assert.deepEqual(emittedEvents[0], {"obj":{"source":"newsfeed","type":"new","data":{"url":"http://singly.com/","sourceObject":{"id":"100002438955325_224550747571079","from":{"name":"Eric Doe","id":"100002438955325"},"message":"Secret weapon!","link":"http://singly.com/","name":"Singly","caption":"singly.com","description":"Singly is the home of the Locker Project and personal data resources.","icon":"http://b.static.ak.fbcdn.net/rsrc.php/v1/yD/r/aS8ecmYRys0.gif","actions":[{"name":"Comment","link":"http://www.facebook.com/100002438955325/posts/101"},{"name":"Like","link":"http://www.facebook.com/100002438955325/posts/101"}],"privacy":{"description":"Friends Only","value":"ALL_FRIENDS"},"type":"link","created_time":1306369954,"updated_time":1306369954}}},"via":"facebook-test","type":"link/facebook","action":"new"});
            assert.equal(undefined, emittedEvents[1]);
            emittedEvents = [];
        },
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
            "and emit proper events" : function(err) {
                assert.deepEqual(emittedEvents[0], {"obj":{"source":"wall","type":"new","data":{"url":"http://singly.com/","sourceObject":{"id":"100002438955325_224550747571079","from":{"name":"Eric Doe","id":"100002438955325"},"message":"Secret weapon!","link":"http://singly.com/","name":"Singly","caption":"singly.com","description":"Singly is the home of the Locker Project and personal data resources.","icon":"http://b.static.ak.fbcdn.net/rsrc.php/v1/yD/r/aS8ecmYRys0.gif","actions":[{"name":"Comment","link":"http://www.facebook.com/100002438955325/posts/123"},{"name":"Like","link":"http://www.facebook.com/100002438955325/posts/123"}],"privacy":{"description":"Friends Only","value":"ALL_FRIENDS"},"type":"link","created_time":1306369954,"updated_time":1306369954}}},"via":"facebook-test","action":"new","type":"link/facebook"});
                assert.deepEqual(emittedEvents[1], {"obj":{"source":"wall","type":"new","data":{"url":"http://www.mymodernmet.com/profiles/blogs/yarn-bombs-26-clever-and-cool","sourceObject":{"id":"103135_185181881531357","from":{"name":"Ashley Doe","id":"103135"},"message":"All my knitter friends! I need you for an amazing installation for ArtTown. If you knit, I need you.  Message me if you\'re interested! Its going to be dope.  ","picture":"http://external.ak.fbcdn.net/safe_image.php?d=ce3fe4282ed07ceb672f024054aa9e68&w=90&h=90&url=http%3A%2F%2Fapi.ning.com%2Ffiles%2F9VKnrL3y87li8LdrJukKC5n0P3lOTcirjHOMKcaLb%2AHrFXGKVnpNSaVE4fma-ahCt81WfOmwupWI%2A-%2ALVSHmw7otvabghjm6%2Fyarnbomb.jpg","link":"http://www.mymodernmet.com/profiles/blogs/yarn-bombs-26-clever-and-cool","name":"Yarn Bombs (26 Clever and Cool Examples) - My Modern Metropolis","caption":"www.mymodernmet.com","description":"Call it crazy. Call it ridiculous. Call it Banksy meets Martha Stewart. Yarn bombing is gripping the nation and there\'s just no stopping it! Just who are thes…","icon":"http://static.ak.fbcdn.net/rsrc.php/v1/yS/r/3TBzrfVdgAR.gif","actions":[{"name":"Comment","link":"http://www.facebook.com/103135/posts/123"},{"name":"Like","link":"http://www.facebook.com/103135/posts/123"}],"type":"link","created_time":1306345485,"updated_time":1306345485}}},"via":"facebook-test","action":"new","type":"link/facebook"});
                assert.deepEqual(emittedEvents[2], {"obj":{"source":"wall","type":"new","data":{"url":"http://www.perpetualkid.com/ipad-etch-a-sketch-case.aspx?utm_source=facebook&utm_medium=facebook&utm_campaign=ipad+etch+a+sketch+case","sourceObject":{"id":"684655824_219338101429383","from":{"name":"Brooke Doe","id":"684655824"},"message":"Now I want an iPad more than ever!!","picture":"http://external.ak.fbcdn.net/safe_image.php?d=b78853a1485206001a189c040d375a27&w=90&h=90&url=http%3A%2F%2Fwww.perpetualkid.com%2Fproductimages%2Fsm2%2FCASE-0114.jpg","link":"http://www.perpetualkid.com/ipad-etch-a-sketch-case.aspx?utm_source=facebook&utm_medium=facebook&utm_campaign=ipad+etch+a+sketch+case","name":"IPAD ETCH-A-SKETCH CASE","caption":"www.perpetualkid.com","description":"You want a good cover for your iPad but one that represents your inner child at the same time!  How about the world’s favorite drawing toy, the Etch A Sketch?!?  Our Etch A Sketch iPad Cover is more than just cool!     Made of impact resistant plastic, this iPad cover also has rubber feet, felt back","icon":"http://b.static.ak.fbcdn.net/rsrc.php/v1/yD/r/aS8ecmYRys0.gif","actions":[{"name":"Comment","link":"http://www.facebook.com/684655824/posts/123"},{"name":"Like","link":"http://www.facebook.com/684655824/posts/123"}],"type":"link","created_time":1306340768,"updated_time":1306357478,"likes":{"data":[{"name":"Ashley Doe","id":"103135"},{"name":"Nate Doe","id":"1575983201"},{"name":"Katie Doe","id":"1547226016"}],"count":4},"comments":{"data":[{"id":"684655824_219338101429383_3321761","from":{"name":"Katie Doe","id":"1547226016"},"message":"I just got an iPad...and I want one now!!!","created_time":1306357478}],"count":1}}}},"via":"facebook-test","action":"new","type":"link/facebook"});
                assert.equal(undefined, emittedEvents[3]);
                emittedEvents = [];
            },
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
        'after ensuring no other events were fired': function(topic) {
            assert.equal(undefined, emittedEvents[0]);
        },
        'sucessfully': function(topic) {
            utils.tearDown();
            fakeweb.tearDown();
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
});

suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Facebook connector")
        .discuss("all contacts")
            .path("/Me/" + svcId + "/getCurrent/friends")
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
            .path("/Me/" + svcId + "/getCurrent/newsfeed")
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
            .path("/Me/" + svcId + "/getCurrent/wall")
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
            .path("/Me/" + svcId + "/get_profile")
            .get()
                .expect("returns the user's profile", function(err, res, body) {
                    assert.isNull(err);
                    var profile = JSON.parse(body);
                    assert.isNotNull(profile);
                    assert.equal(profile.id, '100002438955325'); 
                })
            .unpath()
        .discuss("get photo")
            .path("/Me/" + svcId + "/getPhoto/100002438955325")
            .get()
                .expect("returns a photo", function(err, res, body) {
                    assert.isNull(err);
                    assert.equal(res.statusCode, 200);
                    var me = fs.readFileSync('./fixtures/facebook/photo.gif');
                    assert.equal(body, me);
                })
            .unpath()
        .undiscuss();

        
suite.export(module);
