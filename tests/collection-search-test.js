var lconfig = require('lconfig');
lconfig.load('Config/config.json');
var locker = require('locker');
var assert = require('assert');
var RESTeasy = require('api-easy');
var suite = RESTeasy.describe('Search Collection');
var fakeweb = require('node-fakeweb');
var lsearch = require('lsearch');
var search = require('../Collections/Search/search');
var fs = require('fs');

search.lockerInfo.lockerUrl = 'http://localhost:8042';
locker.lockerBase = search.lockerInfo.lockerUrl;

var contactAddEvent = JSON.parse(fs.readFileSync('fixtures/events/contacts/contacts_collection_contact_1.json','ascii'));
var contactUpdateEvent = JSON.parse(fs.readFileSync('fixtures/events/contacts/contacts_collection_contact_1_updated.json','ascii'));
var contactAddEvent2 = JSON.parse(fs.readFileSync('fixtures/events/contacts/contacts_collection_contact_2.json','ascii'));
var twitterEvent = JSON.parse(fs.readFileSync('fixtures/events/timeline_twitter/twitter_tweet_1.json','ascii'));

fakeweb.allowNetConnect = false;
fakeweb.registerUri({uri : 'http://localhost:8042/Me/twitter/timeline/id/4e604465cec3a369b34a3126', body:JSON.stringify(twitterEvent.obj.data), contentType:"application/json"});
fakeweb.registerUri({uri : 'http://localhost:8042/Me/contacts/id/4e5e9731e4884f5600595b28', body:JSON.stringify(contactAddEvent.obj.data), contentType:"application/json"});
fakeweb.registerUri({uri : 'http://localhost:8042/Me/contacts/id/4e5e9731e4884f5600595b29', body:JSON.stringify(contactAddEvent.obj.data), contentType:"application/json"});

var req = {};
req.headers = {};
req.headers['content-type'] = 'application/json';
req.params = {};
req.param = function(n) { return this.params[n];};

lsearch.setEngine(lsearch.engines.CLucene);
lsearch.setIndexPath(__dirname + '/' + lconfig.me + '/search.index');

suite.next().suite.addBatch({
    'Can set up search collection tests' : {
        topic: function() {
            this.callback(null, 1);
        },
        'successfully' : function(err, response) {
            assert.equal(err, null);
            assert.equal(response, 1);
        }
    }
}).addBatch({
    'Can index new contacts collection event' : {
        topic: function() {
            req.body = contactAddEvent;
            search.handlePostEvents(req, this.callback);
        },
        'successfully' : function(err, response) {
            assert.equal(err, null);
            assert.ok(response.hasOwnProperty('timeToIndex'));
        }
    }
}).addBatch({
    'Can query new contact just indexed' : {
        topic: function() {
            req.params.q = 'matt';
            req.params.type = 'contact*';
            search.handleGetQuery(req, this.callback);
        },
        'successfully' : function(err, response) {
            assert.equal(err, null);
            assert.equal(response.total, 1);
            assert.equal(response.hits.length, 1);
            assert.equal(response.hits[0]._id, '4e5e9731e4884f5600595b28');
            assert.equal(response.hits[0]._type, 'contact');
            assert.equal(response.hits[0]._source, 'contacts');
            // Content is longer stored
            // assert.equal(response.hits[0].content, 'Matt Berry <> Enquiries - Troika - CAA');
        }
    }
}).addBatch({
    'Can index updated contacts collection event' : {
        topic: function() {
            req.body = contactUpdateEvent;
            search.handlePostEvents(req, this.callback);
        },
        'successfully' : function(err, response) {
            assert.equal(err, null);
            assert.ok(response.hasOwnProperty('timeToIndex'));
        }
    }
}).addBatch({
    'Can query updated contact just indexed' : {
        topic: function() {
            req.params.q = 'matthew';
            req.params.type = 'contact*';
            search.handleGetQuery(req, this.callback);
        },
        'successfully' : function(err, response) {
            assert.equal(err, null);
            assert.equal(response.total, 1);
            assert.equal(response.hits.length, 1);
            assert.equal(response.hits[0]._id, '4e5e9731e4884f5600595b28');
            assert.equal(response.hits[0]._type, 'contact');
            assert.equal(response.hits[0]._source, 'contacts');
            // Content is longer stored
            // assert.equal(response.hits[0].content, 'Matthew Berry <> Enquiries - Troika - CAA');
        }
    }
}).addBatch({
    'Can index new twitter status synclet event' : {
        topic: function() {
            req.body = twitterEvent;
            search.handlePostEvents(req, this.callback);
        },
        'successfully' : function(err, response) {
            assert.equal(err, null);
            assert.ok(response.hasOwnProperty('timeToIndex'));
        }
    }
}).addBatch({
    'Can query new twitter status synclet just indexed, within tweet body' : {
        topic: function() {
            req.params.q = 'forkly';
            req.params.type = 'timeline/twitter*';
            search.handleGetQuery(req, this.callback);
        },
        'successfully' : function(err, response) {
            assert.equal(err, null);
            assert.equal(response.total, 1);
            assert.equal(response.hits.length, 1);
            assert.equal(response.hits[0]._id, '4e604465cec3a369b34a3126');
            assert.equal(response.hits[0]._type, 'timeline/twitter');
            assert.equal(response.hits[0]._source, 'twitter/timeline');
            // Content is longer stored
            // assert.equal(response.hits[0].content, 'RT Awesome, @forkly just made it into the NEW listings in the app store in the US! /cc berry @ forkly HQ http://t.co/Deb41Ng <> David Cohen <> davidcohen');
        }
    }
}).addBatch({
    'Can query new twitter status synclet just indexed, within tweet author' : {
        topic: function() {
            req.params.q = 'David';
            req.params.type = 'timeline/twitter*';
            search.handleGetQuery(req, this.callback);
        },
        'successfully' : function(err, response) {
            assert.equal(err, null);
            assert.equal(response.total, 1);
            assert.equal(response.hits.length, 1);
            assert.equal(response.hits[0]._id, '4e604465cec3a369b34a3126');
            assert.equal(response.hits[0]._type, 'timeline/twitter');
            assert.equal(response.hits[0]._source, 'twitter/timeline');
            // Content is longer stored
            // assert.equal(response.hits[0].content, 'RT Awesome, @forkly just made it into the NEW listings in the app store in the US! /cc berry @ forkly HQ http://t.co/Deb41Ng <> David Cohen <> davidcohen');
        }
    }
}).addBatch({
    'Can query new twitter status synclet just indexed, within tweet handle' : {
        topic: function() {
            req.params.q = 'davidcohen';
            req.params.type = 'timeline/twitter*';
            search.handleGetQuery(req, this.callback);
        },
        'successfully' : function(err, response) {
            assert.equal(err, null);
            assert.equal(response.total, 1);
            assert.equal(response.hits.length, 1);
            assert.equal(response.hits[0]._id, '4e604465cec3a369b34a3126');
            assert.equal(response.hits[0]._type, 'timeline/twitter');
            assert.equal(response.hits[0]._source, 'twitter/timeline');
            // Content is longer stored
            // assert.equal(response.hits[0].content, 'RT Awesome, @forkly just made it into the NEW listings in the app store in the US! /cc berry @ forkly HQ http://t.co/Deb41Ng <> David Cohen <> davidcohen');
        }
    }
}).addBatch({
    'Can query across all types for a term' : {
        topic: function() {
            req.params.q = 'berry';
            delete req.params.type;
            search.handleGetQuery(req, this.callback);
        },
        'successfully' : function(err, response) {
            assert.equal(err, null);
            assert.equal(response.total, 2);
            assert.equal(response.hits.length, 2);
        }
    }
}).addBatch({
    'Can handle crazy shit entered as the query term like ' : {
        '*': {
            topic: function() {
                req.params.q = '*';
                search.handleGetQuery(req, this.callback);
            },
            'successfully' : function(err, response) {
                assert.equal(err, 'Please supply a valid query string for /search/query GET request.');
            }
        },
        'anything starting with a *': {
            topic: function() {
                req.params.q = '*ka8s';
                search.handleGetQuery(req, this.callback);
            },
            'successfully' : function(err, response) {
                assert.equal(err, 'Please supply a valid query string for /search/query GET request.');
            }
        },
        'an empty string': {
            topic: function() {
                req.params.q = ' ';
                search.handleGetQuery(req, this.callback);
            },
            'successfully' : function(err, response) {
                assert.equal(err, 'Please supply a valid query string for /search/query GET request.');
            }
        }
    }
});

suite.export(module);
