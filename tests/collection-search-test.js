var lconfig = require('lconfig');
lconfig.load('Config/config.json');
var locker = require('locker');
var assert = require('assert');
var RESTeasy = require('api-easy');
var suite = RESTeasy.describe('Search Collection');
var fakeweb = require('node-fakeweb');
var search = require('../Collections/Search/index');
var fs = require('fs');
search.init("test.db",function(){});


var contactAddEvent = JSON.parse(fs.readFileSync('fixtures/events/contacts/contacts_collection_contact_1.json','ascii'));
var contactUpdateEvent = JSON.parse(fs.readFileSync('fixtures/events/contacts/contacts_collection_contact_1_updated.json','ascii'));
var contactAddEvent2 = JSON.parse(fs.readFileSync('fixtures/events/contacts/contacts_collection_contact_2.json','ascii'));

suite.next().suite.addBatch({
    'Can reset search' : {
        topic: function() {
            search.reset(this.callback);
        },
        'successfully' : function(err, response) {
            assert.equal(err, null);
        }
    }
}).addBatch({
    'Can index new contacts collection event' : {
        topic: function() {
            search.index(contactAddEvent.idr, contactAddEvent.data, false, this.callback);
        },
        'successfully' : function(err, response) {
            assert.equal(err, null);
        }
    }
}).addBatch({
    'Can query new contact just indexed' : {
        topic: function() {
            var ret;
            var self = this;
            search.query({q:'matt'}, function(r){ret=r}, function(err){self.callback(err,ret)});
        },
        'successfully' : function(err, response) {
            assert.equal(err, null);
            assert.equal(response.idr, 'contact://contacts/#4e5e9731e4884f5600595b28');
        }
    }
}).addBatch({
    'Can index updated contacts collection event' : {
        topic: function() {
            var self = this;
            search.index(contactAddEvent.idr, contactAddEvent.data, true, self.callback);
        },
        'successfully' : function(err, response) {
            assert.equal(err, null);
        }
    }
}).addBatch({
    'Can query a specific type' : {
        topic: function() {
            var ret=0;
            var self = this;
            search.query({q:'idr:contact matt'}, function(r){ret++}, function(err){self.callback(err,ret)});
        },
        'successfully' : function(err, response) {
            assert.equal(err, null);
            assert.equal(response, 1);
        }
    }
});

suite.export(module);
