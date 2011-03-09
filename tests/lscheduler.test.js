var assert = require("assert");
var ltest = require("ltest");
var lscheduler = require("lscheduler");
var fs = require("fs");
var http = require("http");
require("lconsole");

ltest.Test("Scheduler schedules an action", function(runner) {
    scheduler = new lscheduler.Scheduler;
    scheduler.at(new Date, function() {
        // stub
    });
    assert.ok(scheduler.scheduledActions.length > 0);
}).isolate();

ltest.Test("Scheduler fires direct callbacks", function(test) {
    scheduler = new lscheduler.Scheduler;
    var actionFired = false;
    var runTime = new Date;
    runTime.setTime(runTime.getTime() + 500);
    scheduler.at(runTime, function() {
        actionFired = true;
        test.emit("success", test);
    });
    setTimeout(function() {
        if (!actionFired) test.emit("fail", test, "Did not fire");
    }, 1000);
}).async().isolate();

ltest.Test("Scheduler fires uri callbacks", function(test) {
    try {
        fs.unlinkSync("Me/testURLCallback/result.json");
    } catch (E) {
    }
    var runTime = new Date;
    runTime.setTime(runTime.getTime() + 500);
    scheduler.at(runTime, "testURLCallback", "/");
    setTimeout(function() {
        var statInfo = fs.statSync("Me/testURLCallback/result.json");
        if (statInfo.isFile()) {
            test.emit("success", test);
        } else {
            test.emit("fail", test, "Did not fire");
        }
    }, 2000);
}).async();

ltest.Test("Scheduler loads pending actions", function(test) {
    scheduler = new lscheduler.Scheduler;
    scheduler.loadAndStart();
    setTimeout(function() {
        if (scheduler.scheduledActions.length > 0) {
            test.emit("success", test);
        } else {
            test.emit("fail", test, "Did not load");
        }
    }, 1000);
}).async().isolate("scheduler");

