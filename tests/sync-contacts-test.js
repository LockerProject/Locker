var contacts = require('../Collections/Contacts/sync.js');
var dataStore = require('../Collections/Contacts/dataStore.js');
var assert = require("assert");
var vows = require("vows");
var currentDir = process.cwd();
var fakeweb = require(__dirname + '/fakeweb.js');
var svcId = 'contacts';

var thecollections = ['contacts'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("config.json");

var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);


vows.describe("Contacts collection sync").addBatch({
    "Can pull in the contacts from foursquare" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.allowLocalConnect = false;
            fakeweb.registerUri({
                uri: 'http://localhost:8043/Me/foursquare/getCurrent/friends',
                file: __dirname + '/fixtures/contacts/foursquare_friends.json' });
            process.chdir('./Me/contacts');
            var self = this;
            lmongoclient.connect(function(collections) {
                contacts.init("", collections.contacts);
                dataStore.init(collections.contacts);
                contacts.getContacts('foursquare', 'friends', 'foursquare', function() {
                    dataStore.getTotalCount(self.callback);
                });
            });
        },
        "successfully" : function(err, resp) {
            assert.isNull(err);
            assert.equal(resp, 2);
        }
    }
}).addBatch({
    "Doesn't duplicate contacts from foursquare" : {
        topic: function() {
            var self = this;
            contacts.getContacts('foursquare', 'friends', 'foursquare', function() {
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
                uri: 'http://localhost:8043/Me/facebook/getCurrent/friends',
                file: __dirname + '/fixtures/contacts/facebook_friends.json' });
            var self = this;
            contacts.getContacts("facebook", "friends", "facebook", function() {
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
            contacts.getContacts('facebook', 'friends', 'facebook', function() {
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
                uri: 'http://localhost:8043/Me/twitter/getCurrent/friends',
                file: __dirname + '/fixtures/contacts/twitter_friends.json' });
            var self = this;
            contacts.getContacts("twitter", "friends", "twitter", function() {
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
            contacts.getContacts('twitter', 'friends', 'twitter', function() {
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
                uri: 'http://localhost:8043/Me/twitter/getCurrent/followers',
                file: __dirname + '/fixtures/contacts/twitter_followers.json' });
            var self = this;
            contacts.getContacts("twitter", "followers", "twitter", function() {
                dataStore.getTotalCount(self.callback);
            });
        },
        "successfully" : function(err, resp) {
            assert.isNull(err);
            assert.equal(resp, 8);
        }
    }
}).addBatch({
    "Tears itself down" : {
        topic: [],
        'sucessfully': function(topic) {
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
}).export(module);