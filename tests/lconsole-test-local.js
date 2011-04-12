/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var vows = require("vows");
var assert = require("assert");

require("../Common/node/lconsole.js");

vows.describe("Locker Console").addBatch({
    "A string" : {
        topic: new Number(100),
        "can be zero padded" : function(num) {
            assert.equal(num.zeroPad(5), "00100");
        }
    },

   "Console replacement" : {
       "can generate a log header" : function() {
            var curModule = console.outputModule
            console.outputModule = "TEST";
            var header = console.logHeader();
            console.outputModule = curModule;
            var now = new Date();
            // There's a tiny race condition if now happened to tick over here but it's not worth mocking Date
            var expectedOut = console.baseColor + "[" + now.getHours().zeroPad(2) + ":" + now.getMinutes().zeroPad(2) + ":" + 
                              now.getSeconds().zeroPad(2) + "][" + console.moduleColor + "TEST" + console.baseColor + "]";

            assert.equal(header, expectedOut);
       },
       "can log simple strings" : function() {
            var outString = "";
            // Setup some mocks
            var realWrite = global.process.stdout.write
            var curModule = console.outputModule
            console.outputModule = "TEST";
            var header = console.logHeader();
            global.process.stdout.write = function(write_str) {
                outString = write_str;
            }
            console.outputModule = "TEST";
            console.log("**TEST**");
            // Restore the stuff we are mocking
            console.outputModule = curModule;
            global.process.stdout.write = realWrite;
            assert.equal(header + " **TEST**\n", outString);
       },
       "can log with a printf like syntax" : function() {
            var outString = "";
            // Setup some mocks
            var realWrite = global.process.stdout.write
            var curModule = console.outputModule
            console.outputModule = "TEST";
            var header = console.logHeader();
            global.process.stdout.write = function(write_str) {
                outString = write_str;
            }
            // We assume this call takes less than a second so we can compare correctly here
            console.log("**%s**", console.outputModule);
            // Restore the stuff we are mocking
            console.outputModule = curModule;
            global.process.stdout.write = realWrite;
            assert.equal(header + " **TEST**\n", outString);
       },
       "can log a warning" : function () {
            // This can not perform a complete test because the error writing is a built in, but we can verify the formatting
            var outString = "";
            // Setup some mocks
            var realWrite = console.realWarn;
            var curModule = console.outputModule
            console.realWarn = function(write_str) {
                outString = write_str;
            }
            console.outputModule = "TEST";
            var header = console.logHeader();
            console.warn("**TEST**");
            // Restore the stuff we are mocking
            console.outputModule = curModule;
            console.realWarn = realWrite; 
            var expectedOut = header + "[" + console.errorColors[0] + "WARNING" + console.baseColor + "] **TEST**";
            assert.equal(expectedOut, outString);
        },
        "can log an error" : function () {
            // This can not perform a complete test because the error writing is a built in, but we can verify the formatting
            var outString = "";
            // Setup some mocks
            var realWrite = console.realWarn;
            var curModule = console.outputModule
            console.realWarn = function(write_str) {
                outString = write_str;
            }
            console.outputModule = "TEST";
            var header = console.logHeader();
            console.error("**TEST**");
            // Restore the stuff we are mocking
            console.outputModule = curModule;
            console.realWarn = realWrite; 
            var expectedOut = header + "[" + console.errorColors[1] + "ERROR" + console.baseColor + "] " + console.errorColors[1] + "**TEST**";
            assert.equal(expectedOut, outString);
        }
   }
}).export(module);
