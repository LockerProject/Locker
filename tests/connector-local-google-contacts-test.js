/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
//testing for the Google Contacts connector

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

var suite = RESTeasy.describe("Google Contacts Connector")

var svcId = "google-contacts-test";

lconfig.load('config.json');

var mePath = '/Me/' + svcId;

suite.use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Google Contacts connector")
        .discuss("can return all contacts")
            .path(mePath + "/allContacts")
            .get()
                .expect(200)
                .expect([ 
                    {"email": [{"value": "temas@singly.com"}], "id": "0", "name": "Thomas Muldowney"},
                    {"email": [{"type":"work", "value": "jer@singly.com"}], "id": "1", "name": "Jeremie Miller"}])
            .unpath()
        .undiscuss()

suite.export(module);
