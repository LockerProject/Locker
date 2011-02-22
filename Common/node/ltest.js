exports.testSuite = {
    tests : [],
    run : function(runner) {
        this.tests.forEach(function(test) { test.run(runner); });
    },

    runTests : function()
    {
        // An object to pass state between tests if needed
        var runner = {};
        exports.testSuite.tests.forEach(function(test) { 
            var output = "Testing " + test.description;
            var dots = 75 - output.length;
            for (var i = 0; i < dots; ++i) output += ".";
            passed = true;
            try {
                test.testCB(runner);
                output += " [\033[0;32mOK" + console.baseColor + "]";
            } catch (e) {
                passed = false;
                output += "[\033[0;31mERR" + console.baseColor +"]\n\n" + e.toString() + "\n";
            }
            console.log(output);
        });
    }
}

exports.Test = function(description, cb) {
    exports.testSuite.tests.push({description:description, testCB:cb});
}
