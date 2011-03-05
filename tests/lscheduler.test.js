var assert = require("assert");
var ltest = require("ltest");
var lscheduler = require("lscheduler");
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
        if (!actionFired) test.emit("failure", test, "Did not fire");
    }, 1000);
}).async().isolate();

ltest.Test("Scheduler fires uri callbacks", function(test) {
    test.actionFired = false;
    server = http.createServer(function(req) {
        test.actionFired = true;
        test.emit("success", test);
        console.log("HERE");
    });
    server.listen(8585, "", function() {
        scheduler = new lscheduler.Scheduler;
        var runTime = new Date;
        runTime.setTime(runTime.getTime() + 500);
        scheduler.at(runTime, "abcd", "/");
        setTimeout(function() {
            server.close();
            if (!test.actionFired) test.emit("failure", test, "Did not fire");
        }, 1000);
    });
}).async().isolate();

ltest.Test("Scheduler loads pending actions", function(test) {
    scheduler = new lscheduler.Scheduler;
    scheduler.loadAndStart();
    setTimeout(function() {
        if (scheduler.scheduledActions.length > 0) {
            test.emit("success", test);
        } else {
            test.emit("failure", test, "Did not load");
        }
    }, 1000);
}).async().isolate("scheduler");

