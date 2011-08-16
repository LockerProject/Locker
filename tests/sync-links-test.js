

var links = require('../Collections/Links/sync.js');
var dataStore = require('../Collections/Links/dataStore.js');
var assert = require("assert");
var vows = require("vows");
var currentDir = process.cwd();
var fakeweb = require(__dirname + '/fakeweb.js');
var mongoCollections;
var svcId = 'links';

var lconfig = require('lconfig');
lconfig.load('Config/config.json');

var request = require('request');

var RESTeasy = require('api-easy');
var suite = RESTeasy.describe("Links Collection");

var link;

var thecollections = ['links'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("Config/config.json");

var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);

var events = 0;

var fs = require('fs');
var twitterEvent1 = fs.readFileSync('fixtures/events/links/twitter_event_1.json','ascii');
var facebookEvent1 = fs.readFileSync('fixtures/events/links/facebook_event_1.json', 'ascii');

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
            process.chdir('./' + lconfig.me + '/links');
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
                uri: lconfig.lockerBase + '/Me/facebook/getCurrent/wall',
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
                uri: lconfig.lockerBase + '/Me/facebook/getCurrent/newsfeed',
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
            assert.deepEqual(link.sourceObjects[0], resp.sourceObjects[0]);
            assert.notDeepEqual(link, resp);
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
            assert.equal(events, 5);
        }
    }
}).addBatch({
    "Facebook ADD event" : {
        topic: function() {
            dataStore.clear();
            dataStore.addEvent(JSON.parse(facebookEvent1), this.callback);},
        "is handled properly" : function(err, object) {
            assert.equal(object.sourceObjects[0].svcID, 'facebook');
            assert.equal(object.url, 'http://singly.com/');
        }
    }
}).addBatch({
    "Twitter ADD event" : {
        topic: function() {
            dataStore.addEvent(JSON.parse(twitterEvent1), this.callback);},
        "is handled properly" : function(err, object) {
            assert.equal(object.sourceObjects[0].svcID, 'twitter');
            assert.equal(object.url, 'http://bit.ly/jBrrAe');
        }
    }
});
        
suite.export(module);
