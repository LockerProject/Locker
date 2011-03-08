require.paths.push(".");
require.paths.push("../Common/node");

var ltest = require("ltest");

// Use our own console output
require("lconsole");
console.outputModule = "Test Run";

// The tests to include
require("lconsole.test.js");
require("lservicemanager.test.js");
require("lscheduler.test.js");

ltest.testSuite.runTests();

process.on("uncaughtException", function(E) {
    process.stdout.write("\n\n");
    console.error("\nUncaught Exception:\n" + E.toString());
    console.trace();
    process.stdout.write("\n\n");
});
