require.paths.push(".");
require.paths.push("../Common/node");

var ltest = require("ltest");

// Use our own console output
require("lconsole");
console.outputModule = "Test Run";

// The tests to include
require("lconsole.test.js");

ltest.testSuite.runTests();
