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

process.on('uncaughtException', function(err) {
  console.error(err);
  console.error(err.stack);
});

var updateState, 
    query,
    auth, 
    allKnownIDs,
    totalMsgCount,
    imap,
    debug = true;
    
exports.eventEmitter = new EventEmitter();

exports.init = function(theAuth, mongo) {
    auth = theAuth;
    try {
        updateState = JSON.parse(fs.readFileSync('updateState.json'));
    } catch (updateErr) {
        updateState = {messages: {}};
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

exports.syncMessages = function(syncMessagesCallback) {
    totalMsgCount = 0;
        
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
                var mailboxArray = [];
                var mailboxQuery = {};
                
                if (debug) console.log('getMailboxPaths');
                exports.getMailboxPaths(mailboxArray, mailboxes);

                for (var i = 0; i < mailboxArray.length; i++) {
                    if (!updateState.messages.hasOwnProperty(mailboxArray[i])) {
                        updateState.messages[mailboxArray[i]] = {};
                        updateState.messages[mailboxArray[i]].syncedThrough = 0;
                    }
                    mailboxQuery.mailbox = mailboxArray[i];
                    mailboxQuery.query = (+updateState.messages[mailboxArray[i]].syncedThrough + 1) + ':*';
                    mailboxArray[i] = lutil.extend({}, mailboxQuery);
                }
                
                async.forEachSeries(mailboxArray, exports.fetchMessages, function(err) {
                    callback(err, 'getboxes');  
                });
            });
        },
        logout: function(callback) {
            if (debug) console.log('logout');
            imap.logout(function(err) {
                return callback(err, 'logout');
            });
        }
    },
    function(err, results) {
        if (err) {
            console.error(err);
        }
        syncMessagesCallback(err, 3600, "sync'd " + totalMsgCount + " new messages");
    });
};

exports.fetchMessages = function(mailboxQuery, fetchMessageCallback) {
    var results = null,
        fetchedCount = 0,
        msgCount = 0,
        mailbox = mailboxQuery.mailbox,
        query = mailboxQuery.query;
        
    if (debug) console.log('fetchMessages');
    
    if (!allKnownIDs.hasOwnProperty(mailbox)) {
        allKnownIDs[mailbox] = {};
    }

    async.series({
        connect: function(callback) {
            if (imap === undefined) {
                if (debug) console.log('connect');
                imap = new ImapConnection(auth);
                imap.connect(function(err) {
                    callback(err, 'connect');
                });
            } else {
                callback(null, 'connect');
            }
        },
        openbox: function(callback) {           
            if (debug) console.log('openbox: ' + mailbox);
            imap.openBox(mailbox, true, function(err, result) {
                callback(err, 'openbox');
            });
        },
        search: function(callback) {
            if (debug) console.log('search: ' + query);
            imap.search([ ['UID', 'SEARCH', query] ], function(err, searchResults) {
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
                
                        /* TODO: ETJ - COMMENTED OUT BODY HANDLING UNTIL MULTIBYTE CHAR BUG IS FIXED IN node-imap MODULE
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
                            bodyMsg.on('error', function(err) {
                                console.log('error: ' + err);
                                callback(err, 'fetch');
                            });
                            bodyMsg.on('end', function() {
                                msgCount++;
                                if (!allKnownIDs[mailbox].hasOwnProperty(message.id)) {
                                    totalMsgCount++;
                                    message.body = body;                             
                                    allKnownIDs[mailbox][message.id] = 1;
                                    storeMessage(mailbox, message);
                                    lfs.writeObjectToFile('allKnownIDs.json', allKnownIDs);
                                }
                                if (debug) console.log('Fetched message ' + msgCount + ' of ' + fetchedCount + ' (message.id: ' + message.id + ')');
                                if (fetchedCount === 0 || msgCount === fetchedCount) {
                                    callback(null, 'fetch');
                                }
                            });
                        });
                        */
                        msgCount++;
                        if (!allKnownIDs[mailbox].hasOwnProperty(message.id)) {
                            totalMsgCount++;                      
                            allKnownIDs[mailbox][message.id] = 1;
                            storeMessage(mailbox, message);
                            lfs.writeObjectToFile('allKnownIDs.json', allKnownIDs);
                        }
                        if (debug) console.log('Fetched message ' + msgCount + ' of ' + fetchedCount + ' (message.id: ' + message.id + ')');
                        if (fetchedCount === 0 || msgCount === fetchedCount) {
                            callback(null, 'fetch');
                        }
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
        if (err) {
            console.error(err);
        }
        fetchMessageCallback(err);
    });
};

function storeMessage(mailbox, msg) {
    if (debug) console.log('storeMessage from ' + mailbox + ' (message.id: ' + msg.id + ')');
    var message = lutil.extend({'messageId': msg.id}, msg);
    message.id = mailbox + '||' + msg.id;
    
    dataStore.addObject('messages', message, function(err) {
        if (err) {
            console.log(err);
        }   
        updateState.messages[mailbox].syncedThrough = message.messageId;
        lfs.writeObjectToFile('updateState.json', updateState);
        
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
            // hardwired skipping Trash, Spam/Junk, and Gmail's "All Mail" IMAP folders
            if (results[i].attribs.indexOf('NOSELECT') === -1 && 
                i !== 'Trash' && i !== 'Spam' && i !== 'Junk' && i !== 'All Mail') {
                mailboxes.push(prefix + i);
            }
            if (results[i].children !== null) {
                exports.getMailboxPaths(mailboxes, results[i].children, prefix + i + results[i].delim);
            }
        }
    }
};