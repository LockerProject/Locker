/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/*
* Tests the acutal implementation of the lservicemanager.
* See locker-core-ap-test.js for a test of the REST API interface to it.
*/
var vows = require("vows");
var assert = require("assert");
var fs = require("fs");
var util = require("util");
var events = require("events");
var request = require("request");
var testUtils = require(__dirname + "/test-utils.js");
var serviceManager = require("lservicemanager.js");
var lconfig = require("lconfig");
lconfig.load("Config/config.json");
var levents = require('levents');
var path = require('path');

var lmongo = require('../Common/node/lmongo.js');

var normalPort = lconfig.lockerPort;
vows.describe("Service Manager").addBatch({
    "Spawning a service": {
        topic : function() {
            request({url:lconfig.lockerBase + '/Me/echo-config/'}, this.callback);
        },
        "passes the externalBase with the process info": function(err, resp, body) {
            var json = JSON.parse(body);
            assert.equal(json.externalBase, lconfig.externalBase + '/Me/echo-config/');
        }
    }
}).export(module);

