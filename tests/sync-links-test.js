

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
var link;

var thecollections = ['links'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("config.json");

var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);
var mePath = '/Me/' + svcId;

var events = 0;

var data = {
    "id": "100002438955325_224550747571079",
    "from": {
        "name": "Eric Doe",
        "id": "100002438955325"
    },
    "message": "Secret weapon!",
    "link": "http://singly.com/",
    "name": "Singly",
    "caption": "singly.com",
    "description": "Singly is the home of the Locker Project and personal data resources.",
    "icon": "http://b.static.ak.fbcdn.net/rsrc.php/v1/yD/r/aS8ecmYRys0.gif",
    "actions": [
        {
           "name": "Comment",
           "link": "http://www.facebook.com/100002438955325/posts/101"
        },
        {
           "name": "Like",
           "link": "http://www.facebook.com/100002438955325/posts/101"
        }
    ],
    "privacy": {
        "description": "Friends Only",
        "value": "ALL_FRIENDS"
    },
    "type": "link",
     "created_time": 1306369954,
     "updated_time": 1306369954
};

suite.next().suite.addBatch({
    "Can pull in the links from twitter" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.allowLocalConnect = false;
            fakeweb.ignoreUri({
                uri: lconfig.lockerBase + '/Me/event-collector/listen/link%2Ffull' });
            fakeweb.registerUri({
                uri: lconfig.lockerBase + '/Me/twitter/getCurrent/home_timeline',
                file: __dirname + '/fixtures/links/twitter_home_timeline.json' });
            var self = this;
            process.chdir('./Me/links');
            request.get({url:lconfig.lockerBase + "/Me/event-collector/listen/link%2Ffull"}, function() {
                lmongoclient.connect(function(mongo) {
                    mongoCollections = mongo.collections.links;
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
}).addBatch({
    "Can successfully merge a link from twitter + facebook" : {
        topic : function() {
            fakeweb.registerUri({
                uri: 'http://localhost:8043/Me/facebook/getCurrent/newsfeed',
                file: __dirname + '/fixtures/links/facebook_newsfeed.json' });
            var self = this;
            // TODO: this should be using the query language when that's implemented.  Nothing should ever really
            // be going direct to mongo like this in a test
            //
            mongoCollections.findOne({'url':'http://bit.ly/k7XVcw'}, function(err, resp) {
                link = resp;
                links.getLinks("facebook", "newsfeed", "facebook", function() {
                    mongoCollections.findOne({'url':'http://bit.ly/k7XVcw'}, self.callback);
                });
            });
        },
        "successfully" : function(err, resp) {
            assert.isNull(err);
            assert.equal(link.url, resp.url);
            assert.isTrue(shallowCompare(link.sourceObjects[0], resp.sourceObjects[0]));
            assert.isFalse(shallowCompare(link, resp));
        }
    }
}).addBatch({
    "Tears itself down" : {
        topic: [],
        'sucessfully': function(topic) {
            fakeweb.allowLocalConnect = true;
            fakeweb.allowNetConnect = true;
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
            assert.equal(events, 3);
        }
    }
}).addBatch({
    // TODO: this should all be going through the actual events system, this is a pretty fragile test currently
    //
    "Posting an event to the links collection" : {
        topic: function() {
            dataStore.clear();
            var self = this;
            request.post({
                url:lconfig.lockerBase + mePath + "/events",
                json:{obj:{
                        source:"friends",
                        type:"new",
                        data: {url:'http://singly.com/', sourceObject:data}
                      },
                      '_via':["facebook-1"]}}, self.callback);
        },
        "returns a 200" : function (err, res, body) {
            assert.equal(res.statusCode, 200);
        },
        "and verify that my data arrived" : {
            topic: function() {
                mongoCollections.findOne({'url':'http://singly.com/'}, this.callback);
            },
            "successfully" : function(err, resp) {
                assert.isNull(err);
                assert.equal(resp.url, 'http://singly.com/');
            },
            "and an event" : {
                topic: function() {
                    request.get({url:lconfig.lockerBase + "/Me/event-collector/getEvents/links"}, this.callback);
                },
                "was generated" : function(err, resp, data) {
                    assert.isNull(err);
                    assert.equal(data, 1);
                }
            }
        }
    }
})
        
suite.export(module);
