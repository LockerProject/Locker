/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
//testing for the IMAP connector against a live IMAP server

var sync = require('../Connectors/IMAP/sync');
var dataStore = require('../Common/node/connector/dataStore');
var assert = require('assert');
var RESTeasy = require('api-easy');
var vows = require('vows');
var fs = require('fs');
var util = require('util');
var currentDir = process.cwd();
var events = {message: 0};

var mockMailboxResults = fs.readFileSync('fixtures/imap/mailboxes.json');

var suite = RESTeasy.describe('IMAP Connector');

process.on('uncaughtException',function(error){
    sys.puts(error.stack);
});

var svcId = 'imap';
var mePath = '/Me/' + svcId;

var thecollections = ['messages'];
var lconfig = require('../Common/node/lconfig');
lconfig.load('config.json');
var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);
var mongoCollections;

var auth = {
    username: 'testmcchester@gmail.com',
    password: 't3st3r!!',
    host: 'imap.gmail.com',
    port: '993',
    secure: true,
    debug: true
};

sync.eventEmitter.on('message/imap', function() {
    events.message++;
});

suite.next().suite.addBatch({
    "Can setup the tests": { 
        topic: function() {
            process.chdir('.' + mePath);
            var self = this;
            lmongoclient.connect(function(mongo) {
                sync.init(auth, mongo);
                dataStore.init('id', mongo);
                self.callback(null, true);
            });
        },
        "successfully": function(err, test) {
            assert.equal(test, true);
        }
    }
}).addBatch({
    "Can parse N-depth mailbox tree": { 
        topic: function() {
            mockMailboxResults = JSON.parse(mockMailboxResults);
            var mailboxes = [];
            sync.getMailboxPaths(mailboxes, mockMailboxResults);
            return mailboxes;
        },
        "successfully": function(mailboxes) {
            assert.length(mailboxes, 9);
            assert.include(mailboxes, 'INBOX');
            assert.include(mailboxes, 'Work');
            assert.include(mailboxes, '[Gmail]/Spam');
            assert.include(mailboxes, '[Gmail]/Spam/Junk');
        }
    }
}).addBatch({
    "Can get messages" : {
        topic: function() {
            sync.syncMessages(null, this.callback);
        },
        "successfully" : function(err, repeatAfter, diaryEntry) {
            assert.equal(repeatAfter, 3600);
            assert.equal(diaryEntry, "sync'd 5 new messages"); },
        "again" : {
            topic: function() {
                sync.syncMessages(null, this.callback);
            },
            "successfully" : function(err, repeatAfter, diaryEntry) {
                assert.equal(repeatAfter, 3600);
                assert.equal(diaryEntry, "sync'd 0 new messages"); 
            }
         }
    }
}).addBatch({
    "Datastore" : {
        "getMessages returns all previously saved messages" : {
            topic: function() {
                dataStore.getAllCurrent('messages', this.callback);
            },
            'successfully': function(err, response) {
                assert.isNull(err);
                assert.isNotNull(response);
                assert.equal(response.length, 5);
                assert.equal(response[0].id, '4');
            }  
        }
    }
}).addBatch({
    "Tears itself down" : {
        topic: [],
        'after checking for proper number of events': function(topic) {
            assert.equal(events.message, 5);
        },
        'sucessfully': function(topic) {
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
});

suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("IMAP connector")
        .discuss("all messages")
            .path(mePath + "/getCurrent/messages")
            .get()
                .expect('returns all current messages', function(err, res, body) {
                    assert.isNull(err);
                    var messages = JSON.parse(body);
                    assert.isNotNull(messages);
                    assert.equal(messages.length, 5); 
                })
            .unpath()
        .undiscuss();

suite.export(module);