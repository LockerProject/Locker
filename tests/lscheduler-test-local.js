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
require.paths.push(__dirname + "/../Common/node");
var lscheduler = require("lscheduler.js");
var fs = require('fs');
var locker = require('locker');
var events = require('events');
var lconfig = require('lconfig');
lconfig.load('config.json');

vows.describe("Locker Scheduling System").addBatch({
    "Scheduler": {
        topic:lscheduler.masterScheduler,
        "schedules a callback": testUtils.timeoutAsyncCallback(250, function(topic, timeout, cb) {
            topic.at(timeout, cb);
        }),
        "schedules a callback to a service": {
            topic: function() {
                lscheduler.masterScheduler.at(1, 'scheduler-tester', 'scheduled');
                var emitter = new events.EventEmitter();
                setTimeout(function() {
                    request.get({uri : lconfig.lockerBase + '/Me/scheduler-tester/getScheduledCount'}, function(err, resp, body) {
                        if (err == null && body == 1) {
                            emitter.emit('success', true);
                        } else {
                            if (err != null) {
                                emitter.emit('error', err);
                            } else {
                                emitter.emit('error', 'body was equal to ' + body + ' instead of 1');
                            }
                        }
                    });
                }, 1500);
                return emitter;
            },
            "successfully" : function(err, fired) {
                assert.isNull(err);
                assert.isTrue(fired);
            }
        }
    }
}).addBatch({
    "Scheduler" : {
        "Issue #77 - Scheduler errors on invalid service IDs" : {
            topic: function() {
                // this is really ghetto, but to force the scheduler in the running locker to save (it has already read + truncated the scheduler.json file)
                // i need to schedule a bogus event.  also a potential race condition
                //
                var emitter = new events.EventEmitter();
                request.get({uri: lconfig.lockerBase + '/core/foursquare/at?at=2500&cb=whatever'}, function() {
                    setTimeout(function() {
                        var scheduled = fs.readFileSync(lconfig.me + '/scheduler.json', 'ascii');
                        if (scheduled != '') {
                            emitter.emit('error', scheduled);
                        } else {
                            emitter.emit('success', true);
                        }
                    }, 1500);
                });
                return emitter;
            },
            "is resolved in a timely fashion" : function(err, fired) {
                assert.isNull(err);
                assert.isTrue(fired);
            }
        }
    }
}).export(module);
