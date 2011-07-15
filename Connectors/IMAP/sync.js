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
    //     console.error(msg);
    // };

};

exports.syncMessages = function(syncMessagesCallback) {
    totalMsgCount = 0;
        
    async.series({
        connect: function(callback) {
            if (debug) console.error('connect');
            imap = new ImapConnection(auth);
            imap.connect(function(err) {
                callback(err, 'connect');
            });
        },
        getboxes: function(callback) {
            if (debug) console.error('getboxes');
            imap.getBoxes(function(err, mailboxes) {
                var mailboxArray = [];
                var mailboxQuery = {};
                
                if (debug) console.error('getMailboxPaths');
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
            if (debug) console.error('logout');
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
        
    if (debug) console.error('fetchMessages');
    
    if (!allKnownIDs.hasOwnProperty(mailbox)) {
        allKnownIDs[mailbox] = {};
    }
    
    var connect = function(callback) {
        // console.error('connecting with, ', auth);
        imap = new ImapConnection(auth);
        imap.connect(function() {
            imap.openBox(mailbox, false, callback);
        });
    }

    async.series({
        connect: connect,
        search: function(callback) {
            if (debug) console.error('search: ' + query);
            imap.search([ ['UID', 'SEARCH', query] ], function(err, searchResults) {
                results = searchResults;
                callback(err, 'search');
            });
        },
        fetch: function(callback) {
            if (debug) console.error('fetch');
            fetchedCount = results.length;
            try {
                getMessages(results, mailbox, connect, function() {
                    callback(null, 'fetch');
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
    if (debug) console.error('storeMessage from ' + mailbox + ' (message.id: ' + msg.id + ')');
    var message = lutil.extend({'messageId': msg.id}, msg);
    message.id = mailbox + '||' + msg.id;
    
    dataStore.addObject('messages', message, function(err) {
        if (err) {
            console.error(err);
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





//-----------------



var uidsPerCycle = 100;
var timeout = 3000;

function getMessages(uids, mailbox, connect, callback) {
    if(!(uids && uids.length)) {
        process.nextTick(callback);
    } else {
        var theseUIDs = uids.splice(0, uidsPerCycle);
        
        doFetch(theseUIDs, { headers: true }, connect, function(headers) {
            doFetch(theseUIDs, { headers: false, body:true }, connect, function(bodies) {
                var messages = headers;
                for(var id in headers) {
                    if(bodies[id])
                        messages[id].body = bodies[id];
                }
                
                for(var i in messages) {
                    var message = messages[i];
                    if (!allKnownIDs[mailbox].hasOwnProperty(message.id)) {
                        allKnownIDs[mailbox][message.id] = 1;
                        storeMessage(mailbox, message);
                        lfs.writeObjectToFile('allKnownIDs.json', allKnownIDs);
                    }
                    if (debug) console.error('Fetched message (message.id: ' + message.id + ')');
                }
                //write to disk, etc
                
                process.nextTick(function() {
                    getMessages(uids, mailbox, connect, callback);
                });
            });
        });
    }
}

function doFetch(uids, request, connect, callback, messages) {
    if(!messages)
        messages = {};
    var fetch = imap.fetch(uids, { request: request });
    var highestUID = 0;
    
    var reset = function() {
        imap._state.conn._readWatcher.socket.destroy();
        connect(function() { //reconnect
            if (debug) console.error('reconnected');
            var sliceAt = 0;
            for(var i in uids) {
                if(parseInt(uids[i]) > highestUID) {
                    sliceAt = parseInt(i) + 1;
                    break;
                }
            }
            if(sliceAt < uids.length - 1)
                doFetch(uids.slice(sliceAt, uids.length), request, connect, callback, messages); //start again from the next one
            else
                callback(messages);
        })
    };
    
    fetch.on('error', function(err) {
        console.error('DEBUG: fetch err', err);
        reset();
    });
    fetch.on('message', function(msg) {
        var t = setTimeout(function() {
            if (debug) console.error('stuck on message, closing connection an reconnecting!!!');
            reset();
        }, timeout);
        msg.on('error', function(err) {
            console.error('DEBUG: msg err', err);
            reset();
        });
        msg.on('end', function() {
            clearTimeout(t);
            if (debug) console.error('Finished: ' + msg.id);
            if(msg.id) {
                if(msg.id > highestUID)
                    highestUID = msg.id;
                messages[msg.id] = msg;
            }
        });
        msg.on('error', function(err) {
            console.error('DEBUG: err', err);
        })
    });
    fetch.on('end', function() {
        if(highestUID < uids[uids.length - 1]) { //something went wrong
            console.error('baaad!');
        }
        callback(messages);
    });
}