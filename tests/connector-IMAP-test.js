/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

//tests for IMAP connector

var assert = require('assert');
var vows = require('vows');
var RESTeasy = require('api-easy');
var http = require('http');
var querystring = require('querystring');
var events = require('events');
var fs = require('fs');
var request = require('request');
var lfs = require('../Common/node/lfs.js');
var locker = require('../Common/node/locker.js');
var lconfig = require('../Common/node/lconfig.js');
var path = require('path');
var testUtils = require(__dirname + "/test-utils.js");

var suite = RESTeasy.describe('IMAP Connector')

var id = 'imap-test';

lconfig.load('config.json');

//requires that the credentials be stored in a file in tests/Me/imap-auth.json
//in the form of {"username":"address@domain.com", "password":"myWickedPassword", "server":"imap.gmail.com"}
try {
    var credstr = fs.readFileSync('Me/' + id + '/secrets.json');
    if(credstr)
        var auth = JSON.parse(credstr);
} catch (E) {
    var auth = undefined;
}

if(auth && auth.username && auth.password && auth.server) {
    
suite.next().suite.addBatch({
    'IMAP Connector can get all messages' : {
        topic:function() {
            var promise = new events.EventEmitter;
        
            request({uri:lconfig.lockerBase + '/Me/' + id + '/update'}, function(err, resp, body) {
                if(err || resp.statusCode != 200) {
                    promise.emit('error', err);
                    return;
                }
                testUtils.waitForPathsToExist(['Me/' + id + '/' + auth.username,
                                               'Me/' + id + '/' + auth.username + '/lastUIDS.json',
                                               'Me/' + id + '/' + auth.username + '/INBOX',
                                               'Me/' + id + '/' + auth.username + '/INBOX/attachments',
//                                               'Me/' + id + '/' + auth.username + '/[Gmail]',
  //                                             'Me/' + id + '/' + auth.username + '/[Gmail]/All Mail'
                                              ], 12, 5000, function(success) {
                    if(success == true)
                        promise.emit('success', true);
                    else
                        promise.emit('error', new Error);
                });
            });
            return promise;
        },
        'and completes within 60 seconds':function(err, stat) {
            assert.isNull(err);
        }
    }
});

var messages = [];
var messagesWithAttachments = [];
suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss('IMAP connector')
        .discuss('can get INBOX messages')
            .path('/Me/' + id + '/allMessages')
            .get('', {box:'INBOX', start:0, end:100}) //INBOX and 0 to 100 are kind of arbitrary, this could be better
                .expect(200)
                .expect('returns messages from INBOX', function(err, res, body) {
                    assert.isNull(err);
                    messages = JSON.parse(body);
                    assert.isNotNull(messages);
                    assert.isNotNull(messages.length);
                })
            .unpath()
        .undiscuss()
        .discuss('can get INBOX messages with attachments')
            .path('/Me/' + id + '/allMessages')
             //INBOX, 0 to 500, and images are kind of arbitrary, this could be better
            .get('', {box:'INBOX', start:0, end:500, attachmentTypes:'image/gif,image/jpg'})
                .expect(200)
                .expect('returns messages with attachments from INBOX', function(err, res, body) {
                    assert.isNull(err);
                    messagesWithAttachments = JSON.parse(body);
                    assert.isNotNull(messagesWithAttachments);
                })
                .expect('all messages returned have attachments', function(err, res, body) {
                    assert.isNull(err);
                    var mssgs = JSON.parse(body);
                    //ensure all messages have attachments
                    for(var i in mssgs) {
                        assert.isNotNull(mssgs[i]);
                        assert.isNotNull(mssgs[i].attachments);
                        assert.isNotNull(mssgs[i].attachments[i]);
                    }
                })
            .unpath()
        .undiscuss()
    .undiscuss();

suite.export(module);

}
