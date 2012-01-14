var lconfig = require('lconfig');
lconfig.load('Config/config.json');
var locker = require('locker');

var contacts = require('../Collections/Contacts/sync.js');
var dataStore = require('../Collections/Contacts/dataStore.js');
var assert = require("assert");
var vows = require("vows");
var currentDir = process.cwd();
var fakeweb = require('node-fakeweb');
var mongoCollections;
var svcId = 'contacts';


var request = require('request');

var RESTeasy = require('api-easy');
var suite = RESTeasy.describe("Contacts Collection");

var friend;

var thecollections = ['contact'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("Config/config.json");

var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);

var events = 0;
var fs = require('fs');
var foursquareEvent1 = fs.readFileSync('fixtures/events/contacts/foursquare_contact_1.json');
var foursquareEvent2 = fs.readFileSync('fixtures/events/contacts/foursquare_contact_2.json');
var foursquareEvent3 = fs.readFileSync('fixtures/events/contacts/foursquare_contact_3.json');

console.log("************* HERE");

suite.next().suite.addBatch({
    "Can pull in the contacts from foursquare" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.allowLocalConnect = false;
            fakeweb.ignoreUri({
                uri: lconfig.lockerBase + '/Me/event-collector/listen/contact' });
            fakeweb.ignoreUri({ uri: lconfig.lockerBase + '/core/contacts/event' });
            fakeweb.registerUri({
                uri: lconfig.lockerBase + '/Me/foursquare/getCurrent/contact',
                contentType:"application/json",
                body: JSON.parse(fs.readFileSync(__dirname + '/fixtures/contacts/foursquare_friends.json')) });
            var self = this;
            locker.initClient({workingDirectory:'./' + lconfig.me + '/contacts', lockerUrl:lconfig.lockerBase});
            request.get({url:lconfig.lockerBase + "/Me/event-collector/listen/contact"}, function() {
                lmongoclient.connect(function(mongo) {
                    mongoCollections = mongo.collections.contact;
                    contacts.init(lconfig.lockerBase, mongoCollections, mongo, lconfig);
                    dataStore.init(mongoCollections, mongo);
                    dataStore.clear();
                    contacts.getContacts('foursquare', 'contact', 'foursquare', function() {
                        dataStore.getTotalCount(self.callback);
                    });
                });
            });
        },
        "successfully" : function(err, resp) {
            console.dir(resp);
            assert.isNull(err);
            assert.equal(resp, 2);
        }
    }
}).addBatch({
    "Doesn't duplicate contacts from foursquare" : {
        topic: function() {
            var self = this;
            contacts.getContacts('foursquare', 'contact', 'foursquare', function() {
                dataStore.getTotalCount(self.callback);
            });
        },
        "successfully" : function(err, resp) {
            assert.isNull(err);
            assert.equal(resp, 2);
        }
    }
}).addBatch({
    "Can pull in the contacts from facebook" : {
        topic : function() {
            fakeweb.registerUri({
                uri: lconfig.lockerBase + '/Me/facebook/getCurrent/contact',
                contentType:"application/json",
                body: JSON.parse(fs.readFileSync(__dirname + '/fixtures/contacts/facebook_friends.json')) });
            var self = this;
            contacts.getContacts("facebook", "contact", "facebook", function() {
                dataStore.getTotalCount(self.callback);
            });
        },
        "successfully" : function(err, resp) {
            assert.isNull(err);
            assert.equal(resp, 7);
        }
    }
}).addBatch({
    "Doesn't duplicate contacts from facebook" : {
        topic: function() {
            var self = this;
            contacts.getContacts('facebook', 'contact', 'facebook', function() {
                dataStore.getTotalCount(self.callback);
            });
        },
        "successfully" : function(err, resp) {
            assert.isNull(err);
            assert.equal(resp, 7);
        }
    }
}).addBatch({
    "Can pull in the contacts from twitter" : {
        topic : function() {
            fakeweb.registerUri({
                uri: lconfig.lockerBase + '/Me/twitter/getCurrent/contact',
                contentType:"application/json",
                body: JSON.parse(fs.readFileSync(__dirname + '/fixtures/contacts/twitter_friends.json')) });
            var self = this;
            contacts.getContacts("twitter", "contact", "twitter", function() {
                dataStore.getTotalCount(self.callback);
            });
        },
        "successfully" : function(err, resp) {
            assert.isNull(err);
            assert.equal(resp, 8);
        }
    }
}).addBatch({
    "Doesn't duplicate contacts from twitter" : {
        topic: function() {
            var self = this;
            contacts.getContacts('twitter', 'contact', 'twitter', function() {
                dataStore.getTotalCount(self.callback);
            });
        },
        "successfully" : function(err, resp) {
            assert.isNull(err);
            assert.equal(resp, 8);
        }
    }
}).addBatch({
    "Can successfully merge a contact from twitter + foursquare" : {
        topic : function() {
            fakeweb.registerUri({
                uri: lconfig.lockerBase + '/Me/twitter/getCurrent/contact',
                contentType:"application/json",
                body: JSON.parse(fs.readFileSync(__dirname + '/fixtures/contacts/twitter_followers.json')) });
            var self = this;
            // TODO: this should be using the query language when that's implemented.  Nothing should ever really
            // be going direct to mongo like this in a test
            //
            mongoCollections.findOne({'accounts.foursquare.data.contact.twitter':'ww'}, function(err, resp) {
                friend = resp;
                contacts.getContacts("twitter", "contact", "twitter", function() {
                    mongoCollections.findOne({'accounts.twitter.data.screen_name':'ww'}, self.callback);
                });
            });
        },
        "successfully" : function(err, resp) {
            assert.isNull(err);
            assert.deepEqual(friend.accounts.foursquare, resp.accounts.foursquare);
            assert.notDeepEqual(resp, friend);
        }
    }
}).addBatch({
    "Foursquare ADD event" : {
        topic: function() {
            dataStore.clear();
            dataStore.addData("foursquare", JSON.parse(foursquareEvent1).data, this.callback); },
        "is handled properly" : function(err, object) {
            assert.equal(object.name, 'Jacob Mitchell');
        }
    }
}).addBatch({
    "Foursquare UPDATE event" : {
        topic: function() {
            dataStore.addData("foursquare",JSON.parse(foursquareEvent2).data, this.callback); },
        "is handled properly" : function(err, object) {
            assert.equal(object.name, 'Jake Mitchell');
        }
    }
}).addBatch({
    "Github ADD event with different via field" : {
        topic: function() {
            dataStore.addData("github",{"gravatar_id":"27e803a71a7774a00d14274def33f92c","company":"Focus.com","name":"James Burkhart","created_at":"2009/07/05 18:16:40 -0700","location":"San Francisco","public_repo_count":4,"public_gist_count":7,"blog":"www.jamesburkhart.com","following_count":8,"id":101964,"type":"User","permission":null,"followers_count":2,"login":"fourk","email":"fake@testdata.com"}, this.callback); },
        "updates to the same account": function(err, object) {
            assert.equal(object.accounts.foursquare[0].data.id, 2715557);
            assert.equal(object.accounts.foursquare[0].data.name, 'Jake Mitchell');
            assert.equal(object.name, 'James Burkhart');
            assert.equal(object.accounts.github[0].data.name, 'James Burkhart');
        }
    }
}).addBatch({
    "Github ADD event with matching email" : {
        topic: function() {
            dataStore.addData("github",{"gravatar_id":"27e803a71a7774a00d14274def33f92c","company":"Focus.com","name":"James Burkhart","created_at":"2009/07/05 18:16:40 -0700","location":"San Francisco","public_repo_count":4,"public_gist_count":7,"blog":"www.jamesburkhart.com","following_count":8,"id":101964,"type":"User","permission":null,"followers_count":2,"login":"fourk","email":"fake@testdata.com"}, this.callback); },
        "updates to the same account": function(err, object) {
            assert.equal(object.accounts.foursquare[0].data.id, 2715557);
            assert.equal(object.accounts.foursquare[0].data.name, 'Jake Mitchell');
            assert.equal(object.name, 'James Burkhart');
            assert.equal(object.accounts.github[0].data.name, 'James Burkhart');
        }
    }
}).addBatch({
    "Google Contacts ADD event with matching email" : {
        topic: function() {
            dataStore.addData("gcontacts",{"id":"29a2af0a88d07f","name":"Jeremie Miller","updated":1262741637890,"email":[{"value":"fake@testdata.com"}],"groups":["67a7891b7cdf1a8a","3199e3868a10dd45"]}, this.callback); },
        "updates to the same account": function(err, object) {
            assert.equal(object.accounts.foursquare[0].data.id, 2715557);
            assert.equal(object.accounts.foursquare[0].data.name, 'Jake Mitchell');
            assert.equal(object.name, 'Jeremie Miller');
            assert.equal(object.accounts.github[0].data.name, 'James Burkhart');
            assert.equal(object.accounts.googleContacts[0].data.name, 'Jeremie Miller');
        }
    }
}).addBatch({
    "state" : {
        topic:function() {
            fakeweb.allowLocalConnect = true;
            request.get({uri:lconfig.lockerBase + "/Me/contacts/state"}, this.callback);
        },
        "contains a lastId":function(topic) {
            var state = JSON.parse(topic.body);
            assert.include(state, "lastId");
        }
    }
});

suite.export(module);
