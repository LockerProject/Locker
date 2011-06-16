/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    async = require('async'),
    lfs = require('../../Common/node/lfs.js'),
    request = require('request'),
    dataStore = require('../../Common/node/connector/dataStore'),
    app = require('../../Common/node/connector/api'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    ImapConnection = require('imap').ImapConnection;

var updateState, 
    auth, 
    allKnownIDs, 
    imap;

exports.eventEmitter = new EventEmitter();

exports.init = function(theAuth, mongo) {
    auth = theAuth;
    try {
        updateState = JSON.parse(fs.readFileSync('updateState.json'));
    } catch (updateErr) { 
        updateState = {messages:{syncedThrough:0}};
    }
    try {
        allKnownIDs = JSON.parse(fs.readFileSync('allKnownIDs.json'));
    } catch (idsError) { 
        allKnownIDs = {};
    }
    dataStore.init('id', mongo);
    
    auth.connTimeout = 30000;
    
    // Need IMAP raw debug output?  Uncomment this mofo
    // auth.debug = function(msg) {
    //     console.log(msg);
    // };
    
};

exports.syncMessages = function (syncMessagesCallback) {
    var results = null,
        msgCount = 0,
        fetchedCount = 0,
        debug = false;

    async.series({
        connect: function(callback) {
            if (debug) console.log('connect');
            imap = new ImapConnection(auth);
            imap.connect(function(err) {
                callback(err, 'connect');
            });
        },
        openbox: function(callback) {
            if (debug) console.log('openbox');
            imap.openBox('INBOX', true, function(err, result) {
                callback(err, 'openbox');
            });
        },
        search: function(callback) {
            if (debug) console.log('search');
            imap.search([ ['UID', 'SEARCH', (+updateState.messages.syncedThrough + 1) + ':*'] ], function(err, searchResults) {
                results = searchResults;
                callback(err, 'search');
            });
        },
        fetch: function(callback) {
            if (debug) console.log('fetch');
            fetchedCount = results.length;
            var headerFetch = imap.fetch(results, { request: { headers: true } });
            headerFetch.on('message', function(headerMsg) {
                headerMsg.on('end', function() {
                    var message = headerMsg;
                    var body = '';
                    var partID = '1';
                    var structure = message.structure;
                    
                    if (message.structure.length > 1) {
                        structure.shift();
                        structure = structure[0];
                    }
                    
                    for (var i=0; i<structure.length; i++) {
                        if (structure[i].hasOwnProperty('type') && 
                            structure[i].type === 'text' &&
                            structure[i].hasOwnProperty('subtype') && 
                            structure[i].subtype === 'plain' &&
                            structure[i].hasOwnProperty('params') &&
                            structure[i].params !== null &&
                            structure[i].params.hasOwnProperty('charset')) {
                                partID = structure[i].partID;
                        }
                    }
                    
                    var bodyFetch = imap.fetch(headerMsg.id, { request: { headers: false, body: partID } });       

                     bodyFetch.on('message', function(bodyMsg) {
                         bodyMsg.on('data', function(chunk) {
                             body += chunk;
                         });
                         bodyMsg.on('end', function() {
                             if (!allKnownIDs[message.id]) {
                                 msgCount++;
                                 message.body = body;                             
                                 allKnownIDs[message.id] = 1;
                                 
                                 storeMessage(message, function(err) {
                                     if (err) {
                                         console.log(err);
                                     }
                                     
                                     var eventObj = { source:'message/imap', 
                                                      type:'add', 
                                                      data: message };
                                     exports.eventEmitter.emit('message/imap', eventObj);
                                      
                                     lfs.writeObjectToFile('allKnownIDs.json', allKnownIDs);
                                 });
                             }
                             if (debug) console.log(msgCount + ':' + fetchedCount + ' (message.id: ' + message.id + ')');
                             if (msgCount === 0 || msgCount === fetchedCount) {
                                 callback(null, 'fetch');
                             }
                        });
                    });
                });
            });
        },
        logout: function(callback) {
            if (debug) console.log('logout');
            imap.logout(function(err) {
                callback(err, 'logout');
            });
        }
    },
    function(err, results) {
        if (err) {
            console.error(err);
        }
        syncMessagesCallback(err, 3600, "sync'd " + msgCount + " new messages");
    });
};

function storeMessage(message, callback) {
    dataStore.addObject('messages', message, function(err) {
        updateState.messages.syncedThrough = message.id;
        lfs.writeObjectToFile('updateState.json', updateState);
        callback(err);
    });
}