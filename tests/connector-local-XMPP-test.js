/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
//testing for the XMPP connector

var assert = require('assert');
var vows = require('vows');
var RESTeasy = require('api-easy');
var http = require('http');
var querystring = require('querystring');
var events = require('events');
var fs = require('fs');
var sys = require('sys');
var request = require('request');
var lfs = require('../Common/node/lfs.js');
var locker = require('../Common/node/locker.js');
var lconfig = require('../Common/node/lconfig.js')
var path = require('path');
var testUtils = require(__dirname + "/test-utils.js");
var net = require("net");

// This is our fake server to simplify things a bit
var server = net.createServer(function(newConn) {
    newConn.write("<stream:stream from='localhost' xmlns:stream='http://etherx.jabber.org/streams' xmlns='jabber:client' version='1.0'>");
    server.close();
});
server.listen(52222);
var suite = RESTeasy.describe("XMPP Connector")

var svcId = "xmpp-test";

lconfig.load('Config/config.json');

var mePath = '/Me/' + svcId;

suite.use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("XMPP connector")
        .discuss("can return messages")
            .path(mePath + "/messages")
            .get()
                .expect(200)
                .expect([{"body": "Testing!", "from": "temas@jabber.org/testing", "timestamp": 1304541812.0595341, "mucnick": "", "mucroom": "", "to": "invalid@invalid.invalid", "type": "chat", "id": "someId1", "subject": ""},
{"body": "Testing 2!", "from": "temas@jabber.org/testing", "timestamp": 1304541813.0595341, "mucnick": "", "mucroom": "", "to": "invalid@invalid.invalid", "type": "chat", "id": "someId2", "subject": ""}])
            .unpath()
        .undiscuss()

        .discuss("can return statuses")
            .path(mePath + "/statuses")
            .get()
                .expect(200)
                .expect([{"status": "I'll bbl", "from": "temas@jabber.org/test", "show": "xa", "timestamp": 1304542026.918576, "priority": 1, "to": "invalid@invalid.invalid", "type": "xa", "id": ""},
{"status": "WooWoo", "from": "jer@jabber.org/test", "show": "", "timestamp": 1304542027.918576, "priority": 1, "to": "invalid@invalid.invalid", "type": "available", "id": ""}])
            .unpath()
        .undiscuss()
    .undiscuss()

suite.export(module);
