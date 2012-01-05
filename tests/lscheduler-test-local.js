/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/
var assert = require("assert");
var request = require("request");
var vows = require("vows");
var testUtils = require(__dirname + "/test-utils.js");
var fs = require('fs');
var lconfig = require('lconfig');
lconfig.load('Config/config.json');
var locker = require('locker');
var events = require('events');
var serviceManager = require('lservicemanager');
var lscheduler = require("lscheduler.js");

serviceManager.scanDirectory("Tests");
serviceManager.findInstalled();

vows.describe("Locker Scheduling System").addBatch({
    "Scheduler": {
        topic:lscheduler.masterScheduler,
        "schedules a callback": testUtils.timeoutAsyncCallback(250, function(topic, timeout, cb) {
            topic.at(timeout, cb);
        })
    }
}).export(module);
