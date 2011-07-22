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
    wrench = require('wrench'),
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
    isSyncing = false,
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
    if(isSyncing) {
        process.nextTick(function() {
            syncMessagesCallback("already syncing", 600, "");
        });
        return;
    } else {
        isSyncing = true;
    }
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
            try {
                fs.mkdirSync('attachments', 0755);
            } catch(err) {
                if(err.code !== 'EEXIST')
                    console.error('DEBUG: err', err);
            }
            imap.getBoxes(function(err, mailboxes) {
                // console.error('DEBUG: mailboxes', mailboxes);
                var mailboxArray = [];
                var mailboxQuery = {};
                // console.error('DEBUG: mailboxArray', mailboxArray);
                // console.error('DEBUG: mailboxes', mailboxes);
                
                if (debug) console.error('getMailboxPaths');
                exports.getMailboxPaths(mailboxArray, mailboxes);
                // console.error('DEBUG: mailboxArray', mailboxArray);

                for (var i = 0; i < mailboxArray.length; i++) {
                    if (!updateState.messages.hasOwnProperty(mailboxArray[i])) {
                        updateState.messages[mailboxArray[i]] = {};
                        updateState.messages[mailboxArray[i]].syncedThrough = 0;
                    }
                    mailboxQuery.mailbox = mailboxArray[i];
                    mailboxQuery.query = (+updateState.messages[mailboxArray[i]].syncedThrough + 1) + ':*';
                    mailboxArray[i] = lutil.extend({}, mailboxQuery);
                }
                
                // try {
                //     fs.mkdir('attachments', 0755);
                // } catch(err) {
                //     console.error('DEBUG: err', err);
                // }
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
        isSyncing = false;
        syncMessagesCallback(err, 600, "sync'd " + totalMsgCount + " new messages");
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
        try {
            if(imap._state.conn._readWatcher.socket)
                imap._state.conn._readWatcher.socket.destroy();
        } catch(exp) {
            console.error('exception while destroying socket! ', exp);
        }
        imap = new ImapConnection(auth);
        imap.connect(function(err) {
            if(err) console.error('DEBUG: err', err);
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
    message.mailbox = mailbox;
    
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
    } else {
        try {
            fs.mkdirSync('attachments/' + cleanPrefix(prefix), 0755);
        } catch(err) {
            if(err.code !== 'EEXIST')
                console.error('DEBUG: err for ', cleanPrefix(prefix), err);
        }
    }
    for (var i in results) {
        if (results.hasOwnProperty(i)) {
            // hardwired skipping Trash, Spam, Junk folders
            if (results[i].attribs.indexOf('NOSELECT') === -1 && 
                i !== 'Trash' && i !== 'Spam' && i !== 'Junk') {
                    try {
                        fs.mkdirSync('attachments/' + cleanPrefix(prefix + '/' + i), 0755);
                    } catch(err) {
                        if(err.code !== 'EEXIST')
                            console.error('DEBUG: err for ', cleanPrefix(prefix), err);
                    }
                mailboxes.push(prefix + i);
            }
            if (results[i].children !== null) {
                exports.getMailboxPaths(mailboxes, results[i].children, prefix + i + results[i].delim);
            }
        }
    }
};

function cleanPrefix(prefix) {
    return prefix.replace(/[^a-zA-Z0-9\/-]/g, '_');
}


var uidsPerCycle = 100;
var timeout = (debug? 10000 : 60000);

function getMessages(uids, mailbox, connect, callback) {
    if(!(uids && uids.length)) {
        process.nextTick(callback);
    } else {
        var theseUIDs = uids.splice(0, uidsPerCycle);
        
        doFetch(theseUIDs, { headers: true }, connect, function(headers) {
            var msgHeadersArray = [];
            for(var i in headers)
                msgHeadersArray.push(headers[i]);
            getBodies(msgHeadersArray, mailbox, connect, function(messages) {
                console.error('DEBUG: messages.length', messages.length);
                
                for(var i in messages) {
                    var message = messages[i];
                    if (!allKnownIDs[mailbox].hasOwnProperty(message.id)) {
                        allKnownIDs[mailbox][message.id] = 1;
                        totalMsgCount++;
                        storeMessage(mailbox, message);
                        lfs.writeObjectToFile('allKnownIDs.json', allKnownIDs);
                    }
                    if (debug) console.error('Fetched message (message.id: ' + message.id + ')');
                }
                process.nextTick(function() {
                    getMessages(uids, mailbox, connect, callback);
                });
            });
        });
    }
}

function getBodies(msgHeadersArray, mailbox, connect, callback, messages) {
    if(!messages) messages = [];
    if(!msgHeadersArray || msgHeadersArray.length < 1) {
        process.nextTick(function() {
            callback(messages);
        });
        return;
    }
    var headers = msgHeadersArray.shift();
    
    console.error('getting body parts for', headers.id);
    getBodyParts(headers, mailbox, connect, function(err, bodyParts) {
        console.error('got body parts for', headers.id);
        // console.error('DEBUG: bodyParts', bodyParts);
        headers.body = bodyParts;
        messages.push(headers);
        getBodies(msgHeadersArray, mailbox, connect, callback, messages);
    });
}


function getBodyParts(msgHeaders, mailbox, connect, callback, body) {
    if(!body) body = [];
    if(!msgHeaders || !msgHeaders.structure || msgHeaders.structure.length < 1) {
        process.nextTick(function() {
            callback(null, body);
        });
        return;
    }
    
    var part = msgHeaders.structure.shift();
    if (part.length > 0)
       part = part[0];
    // console.error('DEBUG: part', part);
    if(!part.partID) {
        process.nextTick(function() {
            getBodyParts(msgHeaders, mailbox, connect, callback, body)
        });
        return;
    }
    console.error('DEBUG: part.partID', part.partID);
    var partFetch = imap.fetch(msgHeaders.id, {request:{headers:false, body: '' + part.partID}});
    var data = '';
    
    var done = function() {
        body.push(part);
        getBodyParts(msgHeaders, mailbox, connect, callback, body);
    };
    
    partFetch.on('error', function(err) {
        console.error('part fetch err', err);
        done();
    });
    partFetch.on('message', function(msg) {
        var t = setTimeout(function() {
            if (debug) console.error('stuck on message ' + msgHeaders.id + ', part ' + part.partID
                    + ' of type ' + part.type + '/' + part.subtype + ', closing connection and reconnecting!!!');
            connect(function() {
                done();
            });
        }, timeout);
        msg.on('data', function(chunk) {
            // console.error('DEBUG: chunk', chunk);
            data += chunk;
        })
        msg.on('error', function(error) {
            console.error('part fetch msg error', error);
            done();
        });
        msg.on('end', function() {
            clearTimeout(t);
            if(part.type == 'text') {
                part.body = data;
            } else if(part && part.disposition && part.disposition.filename && part.disposition.filename.length > 0) {
                var stream = fs.createWriteStream('attachments/' + cleanPrefix(mailbox) + '/' 
                                + msgHeaders.id + '_' + part.partID + '_' + part.disposition.filename, 
                                { flags: 'w', encoding: 'base64'});
                stream.write(data, 'base64');
                stream.end();
                console.error('DEBUG: non-text part', part);
            }
            done();
        });
    })
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
            if (debug) console.error('stuck on message, closing connection and reconnecting!!!');
            reset();
        }, timeout);
        msg.on('error', function(err) {
            console.error('DEBUG: msg err', err);
            reset();
        });
        msg.on('data', function(chunk) {
            console.error('DEBUG: chunk', chunk);
        })
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