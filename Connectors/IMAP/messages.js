/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var async = require('async'),
    lcrypto = require(__dirname + '/../../Common/node/lcrypto')
    lutil = require(__dirname + '/../../Common/node/lutil');
    
var lconfig = require('lconfig');
//TODO: fix lconfig and remove this!
lconfig.load('../../Config/config.json');
var uidsPerCycle = 10;

exports.sync = function(processInfo, syncCallback) {
    var imapConnection;
    var config = processInfo.config || {};
    var updateState = processInfo.config.updateState || {messages:{}};
    
    var mailboxes;
    var allMessages = [];
    
    lcrypto.loadKeys(function() {
        var auth = lutil.extend({}, processInfo.auth);
        auth.username = lcrypto.decrypt(auth.username);
        auth.password = lcrypto.decrypt(auth.password);
        console.error("DEBUG: auth", auth);
        imapConnection = require('./IMAPConnection')(auth);
        imapConnection.connectToServer(function(err) {
            imapConnection.getMailboxArray(function(err, mailboxArray) {
                if(err) {
                    console.error('BARF!!!');
                } else {
                    mailboxes = mailboxArray;
                    async.forEachSeries(mailboxes, fetchMessagesForMailbox, function(err) {
                        if (err) console.error(err);
                        var responseObj = {data : {}};
                        responseObj.data.message = messages;
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
        imapConnection.fetchMessages(mailbox, query, uidsPerCycle, function(err, messages) {
            for(var i in messages)
                allMessages.push(messages[i]);
        });
    }
}