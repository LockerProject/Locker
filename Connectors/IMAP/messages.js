/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var lconfig = require('lconfig');
//TODO: fix lconfig and remove this!
lconfig.load('../../Config/config.json');

var async = require('async'),
    lcrypto = require(__dirname + '/../../Common/node/lcrypto'),
    logger = require(__dirname + '/../../Common/node/logger')
    lutil = require(__dirname + '/../../Common/node/lutil');
    

var uidsPerCycle = 25;

exports.sync = function(processInfo, syncCallback) {
    var imapConnection;
    var config = processInfo.config = processInfo.config || {};
    var updateState = processInfo.config.updateState = processInfo.config.updateState || {messages:{}};
    
    var mailboxes;
    var allMessages = [];
    
    lcrypto.loadKeys(function() {
        var auth = lutil.extend({}, processInfo.auth);
        auth.username = lcrypto.decrypt(auth.username);
        auth.password = lcrypto.decrypt(auth.password);
        imapConnection = require('./IMAPConnection')(auth);
        imapConnection.connectToServer(function(err) {
            imapConnection.getMailboxArray(function(err, mailboxes) {
                console.error("DEBUG: mailboxes", mailboxes);
                if(err) {
                    console.error('BARF!!!');
                } else {
                    async.forEachSeries(mailboxes, fetchMessagesForMailbox, function(err) {
                        if (err) console.error(err);
                        var responseObj = {data : {}};
                        responseObj.data.message = allMessages;
                        responseObj.config = config;
                        syncCallback(err, responseObj);
                    });
                }
            });
        });
    });
    
    function fetchMessagesForMailbox(mailbox, callback) {
        
        if(!updateState.messages[mailbox])
            updateState.messages[mailbox] = {syncedThrough: 0};
        var query = (updateState.messages[mailbox].syncedThrough + 1) + ':*'
        var start = Date.now();
        imapConnection.fetchMessages(mailbox, query, uidsPerCycle, function(err, messages) {
            console.error('for mailbox', mailbox, 'imapConnection.fetchMessages took', Date.now() - start);
            if(err) {
                console.error("DEBUG: err", err);
            } else if(messages) {
                for(var i in messages) {
                    var msg = messages[i];
                    msg.messageId = msg.id;
                    msg.mailbox = mailbox;
                    msg.id = msg.mailbox + "||" + msg.id
                    delete msg._events;
                    allMessages.push({'obj' : msg, timestamp: new Date(msg.date)});
                    if(msg.messageId > updateState.messages[mailbox].syncedThrough)
                         updateState.messages[mailbox].syncedThrough = msg.messageId;
                }
                console.error("DEBUG: updateState", updateState);
            }
            callback(err);
        });
    }
}