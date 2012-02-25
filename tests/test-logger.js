var nu = require("nodeunit");
var path = require("path");
var lconfig = require("lconfig");
lconfig.logging = {console:true};
var logger = require(path.join("..", "Common", "node", "logger.js"));
var util = require("util");

exports["buffer objects should give a stack trace"] = function(test) {
    test.expect(1);

    // We handle writes to test the output
    var _puts = util.puts;
    var _error = util.error;
    util.puts = function(buf) {
        // Just eat stdout
    };
    util.error = function(buf) {
        test.notEqual(buf.indexOf("A nonstring was passed to the logger and was converted to utf8"), -1);
        // Eat the output
    };

    var buffer = new Buffer(28);
    buffer.write("test string\nwith a newline\n");
    logger.log("info", buffer);

    util.puts = _puts;
    util.error = _error;

    test.done();
}


