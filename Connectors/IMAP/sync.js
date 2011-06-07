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
    EventEmitter = require('events').EventEmitter,
    ImapConnection = require('imap').ImapConnection;

var updateState, auth, allKnownIDs, imap;

exports.eventEmitter = new EventEmitter();

exports.init = function(theAuth, mongoCollections) {
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
    dataStore.init('id', mongoCollections);
    
    // Need IMAP raw debug output?  Uncomment this mofo
    // auth.debug = function(msg) {
    //     console.error(msg);
    // };
};

exports.syncMessages = function (callback) {
    var box, 
        cmds, 
        next = 0,
        msgCount = 0,
        fetchedCount = 0;
        messages = [];

    async.series({
        imap: function(seriesCallback) {
            imap = new ImapConnection(auth);
            
            var cb = function(err) {
                if (err) {
                    console.error(err);
                    seriesCallback(err, 'imap');
                } else if (next < cmds.length) {
                    cmds[next++].apply(this, Array.prototype.slice.call(arguments).slice(1));
                }
            };
            cmds = [
                function() { imap.connect(cb); },
                function() { imap.openBox('INBOX', true, cb); },
                function(result) { box = result; imap.search([ ['UID', 'SEARCH', (+updateState.messages.syncedThrough + 1) + ':*'] ], cb); },
                function(results) {
                    fetchedCount = results.length;
                    var headerFetch = imap.fetch(results, { request: { headers: true } });
                    headerFetch.on('message', function(headerMsg) {
                        headerMsg.on('end', function() {
                            var message = {};
                            message = headerMsg;

                            var body = '';
                            var bodyFetch = imap.fetch(headerMsg.id, { request: { headers: false, body: true } });       

                             bodyFetch.on('message', function(bodyMsg) {
                                 bodyMsg.on('data', function(chunk) {
                                     //console.log('Got message chunk of size ' + chunk.length);
                                     //mailParser.feed(chunk);
                                     body += chunk;
                                 });
                                 bodyMsg.on('end', function() {
                                     message.body = body.substring(0, 1024);
                                     if (!allKnownIDs[message.id]) {
                                         messages.push(message);
                                         msgCount++;
                                         allKnownIDs[message.id] = 1;
                                         var eventObj = { source:'message/imap', 
                                                          type:'add', 
                                                          data: message };
                                         exports.eventEmitter.emit('message/imap', eventObj);
                                     }
                                     if (msgCount === 0 || msgCount === fetchedCount) {
                                         seriesCallback(null, 'imap');
                                     }
                                 });
                             });
                        });
                    });
                    headerFetch.on('end', function() {
                        imap.logout(cb);
                    });
                }
            ];
            cb();
        },
        store: function(seriesCallback) {
            var count = messages.length;
            storeMessages(messages, function() {
                seriesCallback(null, {count: count});
            });
        }
    },
    function(err, results) {
        lfs.writeObjectToFile('allKnownIDs.json', allKnownIDs);
        callback(err, 600, "sync'd " + results.store.count + " new messages");
    });
};

function storeMessages(messages, callback) {
    if (!messages || !messages.length) {
        callback();
    }
    var message = messages.shift();
    if (message !== undefined) {
        dataStore.addObject('messages', message, function(err) {
            updateState.messages.syncedThrough = message.id;
            lfs.writeObjectToFile('updateState.json', updateState);
            storeMessages(messages, callback);
        });
    }
}