/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var vows = require("vows");
var testUtils = require(__dirname + "/test-utils.js");
require.paths.push(__dirname + "/../Common/node");
var lscheduler = require("lscheduler.js");

vows.describe("Locker Scheduling System").addBatch({
    "Scheduler": {
        topic:lscheduler.masterScheduler,
        "schedules a callback": testUtils.timeoutAsyncCallback(250, function(topic, timeout, cb) {
                topic.at(timeout, cb);
            })
    }
}).export(module);
