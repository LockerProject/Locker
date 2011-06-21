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
    lutil = require('../../Common/node/lutil.js'),
    EventEmitter = require('events').EventEmitter,
    ImapConnection = require('./imap').ImapConnection;

var updateState, 
    searchQuery,
    auth, 
    allKnownIDs,
    totalMsgCount = 0,
    imap,
    debug = true;
    
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

exports.syncMessages = function (query, syncMessagesCallback) {
    searchQuery = query;
    
    async.series({
        connect: function(callback) {
            if (debug) console.log('connect');
            imap = new ImapConnection(auth);
            imap.connect(function(err) {
                callback(err, 'connect');
            });
        },
        getboxes: function(callback) {
            if (debug) console.log('getboxes');
            imap.getBoxes(function(err, mailboxes) {
                mailboxArray = [];
    
                if (debug) console.log('getMailboxPaths');
                exports.getMailboxPaths(mailboxArray, mailboxes);

                async.forEachSeries(mailboxArray, fetchMessages, function(err) {
                    callback(err, 'getboxes');  
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
        console.log(results);
        if (err) {
            console.error(err);
        }
        syncMessagesCallback(err, 3600, "sync'd " + msgCount + " new messages");
    });
};

function fetchMessages(mailbox, fetchMessageCallback) {
    var results = null,
        fetchedCount = 0,
        msgCount = 0;
    if (debug) console.log('fetchMessages: ' + mailbox);
    
    async.series({
        openbox: function(callback) {
            if (debug) console.log('openbox');
            imap.openBox(mailbox, true, function(err, result) {
                callback(err, 'openbox');
            });
        },
        search: function(callback) {
            if (searchQuery === null) {
                searchQuery = (+updateState.messages.syncedThrough + 1) + ':*';
            }
            if (debug) console.log('search: ' + searchQuery);
            imap.search([ ['UID', 'SEARCH', searchQuery] ], function(err, searchResults) {
                results = searchResults;
                callback(err, 'search');
            });
        },
        fetch: function(callback) {
            if (debug) console.log('fetch');
            fetchedCount = results.length;
            try {
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
                                 if (!allKnownIDs[message.headers['message-id']]) {
                                     msgCount++;
                                     totalMsgCount++;
                                     message.body = body;                             
                                     allKnownIDs[message.headers['message-id']] = 1;
                                     storeMessage(message);
                                     lfs.writeObjectToFile('allKnownIDs.json', allKnownIDs);
                                 }
                                 if (debug) console.log(msgCount + ':' + fetchedCount + ' (message-id: ' + message.headers['message-id'] + ')');
                                 if (msgCount === 0 || msgCount === fetchedCount) {
                                     callback(null, 'fetch');
                                 }
                            });
                        });
                    });
                });
            } catch(e) {
                // catch IMAP module's lame exception handling here and parse to see if it's REALLY an exception or not. Bah!
                if (e.message !== 'Nothing to fetch') {
                    console.error(e);
                    callback(e, 'fetch');
                } else {
                    callback(null, 'fetch');
                }
            }
        }
    },
    function(err, results) {
        console.log(results);
        if (err) {
            console.error(err);
        }
        fetchMessageCallback(null);
    });
}

function storeMessage(message) {
    if (debug) console.log('storeMessage: ' + message.headers['message-id']);
    
    // TODO: Add per-mailbox syncedThrough support
    dataStore.addObject('messages', message, function(err) {
        updateState.messages.syncedThrough = message.id;
        lfs.writeObjectToFile('updateState.json', updateState);
        if (err) {
            console.log(err);
        }
        var eventObj = { source:'message/imap',
                         type:'add',
                         data: message };
        exports.eventEmitter.emit('message/imap', eventObj);
    });
}

exports.getMailboxPaths = function(mailboxes, results, prefix) {
    if (prefix === undefined) {
        prefix = '';
    }
    for (var i in results) {
        if (results.hasOwnProperty(i)) {
            if (results[i].attribs.indexOf('NOSELECT') === -1 && i !== 'All Mail' && i !== 'Sent Mail') {
                mailboxes.push(prefix + i);
            }
            if (results[i].children !== null) {
                exports.getMailboxPaths(mailboxes, results[i].children, prefix + i + results[i].delim);
            }
        }
    }
};