

var links = require('../Collections/Links/sync.js');
var dataStore = require('../Collections/Links/dataStore.js');
var assert = require("assert");
var vows = require("vows");
var currentDir = process.cwd();
var fakeweb = require(__dirname + '/fakeweb.js');
var mongoCollections;
var svcId = 'links';

var request = require('request');

var RESTeasy = require('api-easy');
var suite = RESTeasy.describe("Links Collection")

var shallowCompare = require('../Common/node/shallowCompare.js');
var friend;

var thecollections = ['links'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("config.json");

var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);
var mePath = '/Me/' + svcId;

var events = 0;

var data = {id: 18387, 
            firstName: "William", 
            lastName: "Warnecke",
            photo: "https://foursquare.com/img/blank_boy.png",
            gender: "male",
            homeCity: "San Francisco, CA",
            relationship: "friend",
            type: "user",
            pings: true,
            contact: { "email": "lockerproject@sing.ly", "twitter": "ww" },
            badges: { "count": 25 },
            mayorships: { "count": 0, "items": [] },
            checkins: { "count": 0 },
            friends: { "count": 88, "groups": ["Object"] },
            following: { "count": 13 },
            tips: { "count": 5 },
            todos: { "count": 1 },
            scores: { "recent": 14, "max": 90,"checkinsCount": 4 },
            name: "William Warnecke" };

suite.next().suite.addBatch({
    "Can pull in the links from twitter" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.allowLocalConnect = false;
            fakeweb.ignoreUri({
                uri: 'http://localhost:8043/Me/event-collector/listen/link%2Ffull' });
            fakeweb.registerUri({
                uri: 'http://localhost:8043/Me/twitter/getCurrent/home_timeline',
                file: __dirname + '/fixtures/links/twitter_home_timeline.json' });
            var self = this;
            process.chdir('./Me/links');
            request.get({url:lconfig.lockerBase + "/Me/event-collector/listen/link%2Ffull"}, function() {
                lmongoclient.connect(function(collections) {
                    mongoCollections = collections.links;
                    links.init("", mongoCollections);
                    dataStore.init(mongoCollections);
                    dataStore.clear();
                    links.eventEmitter.on('link/full', function(obj) {
                        events++;
                    });
                    links.getLinks('twitter', 'home_timeline', 'twitter', function() {
                        dataStore.getTotalCount(self.callback);
                    });
                });
            });
        },
        "successfully" : function(err, resp) {
            assert.isNull(err);
            assert.equal(resp, 1);
        }
    }
}).addBatch({
    "Doesn't duplicate links from twitter" : {
        topic: function() {
            var self = this;
            links.getLinks('twitter', 'home_timeline', 'twitter', function() {
                dataStore.getTotalCount(self.callback);
            });
        },
        "successfully" : function(err, resp) {
            assert.isNull(err);
            assert.equal(resp, 1);
        }
    }
}).addBatch({
    "Can pull in the links from facebook" : {
        topic : function() {
            fakeweb.registerUri({
                uri: 'http://localhost:8043/Me/facebook/getCurrent/wall',
                file: __dirname + '/fixtures/links/facebook_wall.json' });
            var self = this;
            links.getLinks("facebook", "wall", "facebook", function() {
                dataStore.getTotalCount(self.callback);
            });
        },
        "successfully" : function(err, resp) {
            assert.isNull(err);
            assert.equal(resp, 2);
        }
    }
}).addBatch({
    "Doesn't duplicate links from facebook" : {
        topic: function() {
            var self = this;
            links.getLinks("facebook", "wall", "facebook", function() {
                dataStore.getTotalCount(self.callback);
            });
        },
        "successfully" : function(err, resp) {
            assert.isNull(err);
            assert.equal(resp, 2);
        }
    }    
// }).addBatch({
//     "Can successfully merge a contact from twitter + foursquare" : {
//         topic : function() {
//             fakeweb.registerUri({
//                 uri: 'http://localhost:8043/Me/twitter/getCurrent/followers',
//                 file: __dirname + '/fixtures/contacts/twitter_followers.json' });
//             var self = this;
//             // TODO: this should be using the query language when that's implemented.  Nothing should ever really
//             // be going direct to mongo like this in a test
//             //
//             mongoCollections.findOne({'accounts.foursquare.data.contact.twitter':'ww'}, function(err, resp) {
//                 friend = resp;
//                 contacts.getContacts("twitter", "followers", "twitter", function() {
//                     mongoCollections.findOne({'accounts.twitter.data.screen_name':'ww'}, self.callback);
//                 });
//             });
//         },
//         "successfully" : function(err, resp) {
//             assert.isNull(err);
//             assert.isTrue(shallowCompare(friend.accounts.foursquare, resp.accounts.foursquare));
//             assert.isFalse(shallowCompare(resp, friend));
//         }
//     }
}).addBatch({
    "Tears itself down" : {
        topic: [],
        'sucessfully': function(topic) {
            fakeweb.allowLocalConnect = true;
            fakeweb.allowNetConnect = true;
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
            assert.equal(events, 2);
        }
    }
// }).addBatch({
//     // TODO: this should all be going through the actual events system, this is a pretty fragile test currently
//     //
//     "Posting an event to the contacts collection" : {
//         topic: function() {
//             dataStore.clear();
//             var self = this;
//             request.post({
//                 url:lconfig.lockerBase + mePath + "/events",
//                 json:{"obj":{"source":"friends","type":"add","data": data},"_via":["foursquare"]}}, self.callback);
//         },
//         "returns a 200" : function (err, res, body) {
//             assert.equal(res.statusCode, 200);
//         },
//         "and verify that my data arrived" : {
//             topic: function() {
//                 mongoCollections.findOne({'accounts.foursquare.data.contact.twitter':'ww'}, this.callback);
//             },
//             "successfully" : function(err, resp) {
//                 assert.isNull(err);
//                 assert.equal(resp.accounts.foursquare[0].data.id, 18387)
//             },
//             "and an event" : {
//                 topic: function() {
//                     request.get({url:lconfig.lockerBase + "/Me/event-collector/getEvents/contacts"}, this.callback);
//                 },
//                 "was generated" : function(err, resp, data) {
//                     assert.isNull(err);
//                     assert.equal(data, 1);
//                 }
//             }
//         }
//     }
})
        
suite.export(module);
