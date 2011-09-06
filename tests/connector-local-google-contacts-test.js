/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
//testing for the Google Contacts connector

var fakeweb = require(__dirname + '/fakeweb.js');
var sync = require('../Connectors/GoogleContacts/sync');
var dataStore = require('../Common/node/connector/dataStore');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var fs = require("fs");
var currentDir = process.cwd();
var emittedEvents = [];
require.paths.push(__dirname + "/../Common/node");
var serviceManager = require("lservicemanager.js");
var suite = RESTeasy.describe("Google Contacts Connector");
var utils = require('./test-utils');

process.setMaxListeners(0);
process.on('uncaughtException',function(error){
    sys.puts(error.stack);
});

var svcId = "google-contacts-test";
var mePath = '/Data/' + svcId;

var thecollections = ['contacts', 'groups'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("Config/config.json");
var locker = require('../Common/node/locker');
var request = require('request');
var levents = require('../Common/node/levents');

var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);
var mongoCollections;

sync.eventEmitter.on('contact/google', function(eventObj) {
    levents.fireEvent('contact/google', 'gcontacts', "new", eventObj);
});

suite.next().suite.addBatch({
    "Can sync contacts" : {
        topic: function() {
            utils.hijackEvents(['contact/google'], 'gcontacts');
            utils.eventEmitter.on('event', function(body) { 
                var obj = JSON.parse(body);
                // We need to hide the timestamp, it's too hard to test
                delete obj.timestamp;
                emittedEvents.push(obj);
            });
            
            locker.initClient({lockerUrl:lconfig.lockerBase, workingDirectory:"." + mePath});
            process.chdir('.' + mePath);
            var self = this;
            lmongoclient.connect(function(collections) {
                sync.init(JSON.parse(fs.readFileSync(__dirname + mePath + '/auth.json')), collections);
                dataStore.init("id", collections);
                fakeweb.allowNetConnect = false;
                fakeweb.registerUri({
                    uri : 'https://www.google.com/m8/feeds/contacts/default/full?updated-min=1970-01-01T00%3A00%3A00Z&showdeleted=true&sortorder=ascending&orderby=lastmodified&max-results=3000&oauth_token=abc&alt=json',
                    file : __dirname + '/fixtures/googleContacts/contacts.json' });
                sync.syncContacts(self.callback);
            });
        },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 600);
            assert.equal(diaryEntry, "updated 2 contacts"); },
        "generates a 2 contact events" : function(err) {
            assert.deepEqual(emittedEvents[0], {"obj":{"type":"update","data":{"id":"29a2af0a88d07f","name":"Jeremie Miller","updated":1262741637890,"email":[{"value":"jer@jabber.org"}],"groups":["67a7891b7cdf1a8a","3199e3868a10dd45"]}},"via":"gcontacts","type":"contact/google","action":"new"});
            assert.equal(emittedEvents.length, 2);
            emittedEvents = [];
        }
    }
}).addBatch({
    "Datastore" : {
        "getPeopleCurrent returns all previously saved contacts" : {
            topic: function() {
                dataStore.getAllCurrent("contacts", this.callback);
            },
            'successfully': function(err, response) {
                assert.equal(response.length, 2);
                assert.equal(response[0].id, '29a2af0a88d07f');
                assert.equal(response[0].name, 'Jeremie Miller');
                assert.equal(response[1].id, '1bce305058466d47');
                assert.equal(response[1].name, 'Thomas Muldowney');
            }
        },
    }
});

suite.next().suite.addBatch({
    "Tears itself down" : {
        topic: [],
        'after ensuring no other events were emitted that we werent prepared for': function(topic) {
            assert.equal(emittedEvents[0], undefined); },
        'sucessfully': function(topic) {
            utils.tearDown();
            fakeweb.tearDown();
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
})

suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Google Contacts connector")
        .discuss("all contacts")
            .path("/Me/" + svcId + "/getCurrent/contacts")
            .get()
                .expect('returns contacts', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 2);
                })
            .unpath()
        .undiscuss()     
        
suite.export(module);
