/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var crypto = require("crypto");
var fs = require("fs");
var rimraf = require("rimraf"); // rm -rf helper, npm install rimraf
var util = require("util");
var events = require("events");

fs.exists = function(path) {
    try {
        if (fs.statSync(path)) return true;
    } catch (E) {
        return false;
    }
}

exports.NotImplemented = function() {
    this.name = "Error";
    this.message = "Not yet implemented";
}
exports.NotImplemented.prototype = new Error;

exports.notImplemented = function() { throw new exports.NotImplemented; }; 

function TestDescription(description, cb) {
    events.EventEmitter.call(this);

    this.sync = true;
    this.isolatedDir = false;
    this.workingDirIsTemp = false;
    this.description = description;
    this.testCB = cb;
}

util.inherits(TestDescription, events.EventEmitter);

/**
* Flags the test to be ran in an isolated working directory.
*
* \param presetDir The directory name to use
*
* This should be used whenever you are doing filesystem operations so you can test them cleanly.
* If no preset directory name is specified a randomly named one is created.
*/
TestDescription.prototype.isolate = function(presetDir) { 
    if (presetDir) {
        this.isolatedDir = presetDir;
        return this;
    }

    var hash = crypto.createHash("sha1");
    hash.update(this.description);
    hash.update(Date.now()+'');
    this.isolatedDir = hash.digest("hex");
    this.workingDirIsTemp = true;
    return this;
}

/**
* Flags the test to be ran synchronously
*
* The result is handled by exceptions rather than events
*/
TestDescription.prototype.async = function() {
    this.sync = false;
    return this;
}

exports.testSuite = {
    tests : [],
    testPosition : 0,
    successes : 0,
    failures : 0,
    startTime : 0,
    run : function(runner) 
    {
        this.tests.forEach(function(test) { test.run(runner); });
    },

    passedTest : function(test)
    {
        var self = exports.testSuite;
        self.successes++;
        process.stdout.write("[\033[0;32mOK" + console.baseColor + "]\n");
        self.cleanupTest(test);
    },

    failedTest : function(test, errorMessage)
    {
        var self = exports.testSuite;
        self.failures++;
        process.stdout.write("[\033[0;31mERR" + console.baseColor +"]\n\n" + errorMessage + "\n\n");
        self.cleanupTest(test);
    },

    cleanupTest : function(test)
    {
        var self = exports.testSuite;
        // Fix the working directory and remove temps
        if (test.isolatedDir) {
            process.chdir("..");
            if (test.workingDirIsTemp) rimraf.sync(test.isolatedDir);
        }
        self.testPosition++;
        process.nextTick(self.runTests);
    },

    runTests : function()
    {
        var self = exports.testSuite;
        // Initial setup things
        if (self.testPosition === 0) {
            self.startTime = new Date();
        }
        // Cleanup and output
        if (self.testPosition >= self.tests.length) {
            var runTime = (Date.now() - self.startTime.getTime()) / 1000;
            process.stdout.write("\nRan " + self.tests.length + " tests in " + 
                runTime + " seconds " + self.successes + " successes " + self.failures + " failures.\n");
            return;
        }
        // An object to pass state between tests if needed
        var test = self.tests[self.testPosition];

        var output = "Testing " + test.description;
        var dots = 75 - output.length;
        for (var i = 0; i < dots; ++i) output += ".";
        // Put this in a tmp directory
        if (test.isolatedDir) {
            if (!fs.exists(test.isolatedDir)) fs.mkdirSync(test.isolatedDir, 777);
            process.chdir(test.isolatedDir);
        }
        process.stdout.write(output);
        test.on("success", self.passedTest);
        test.on("failure", self.failedTest);
        try {
            test.testCB(test);
            if (test.sync) test.emit("success", test);
        } catch (e) {
            test.emit("failure", test, e);
        }
    }
}

exports.Test = function(description, cb) {
    var testDescription = new TestDescription(description, cb);
    exports.testSuite.tests.push(testDescription);
    return testDescription;
}

