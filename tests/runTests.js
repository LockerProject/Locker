var fs = require("fs");
var net = require("net");
var path = require("path");
process.env["NODE_PATH"] = path.join(__dirname, "..", "Common", "node"); // for spawn'd nodelings
var lconfig = require(__dirname + "/../Common/node/lconfig");
lconfig.load("Config/config.json");
var wrench = require("wrench");
var runIntegration = true;
var integrationOnly = false;

var runFiles = [];
var runGroups = [];

if (process.argv.indexOf("-c") === -1) {
    try {
        wrench.rmdirSyncRecursive(lconfig.me);
    } catch (E) {
        if (E.code != "ENOENT") {
            process.stderr.write("Error: " + E + "\n");
            process.exit(1);
        }
    }
    wrench.copyDirSyncRecursive(lconfig.me + ".tests", lconfig.me);

    // Cleanup the old runs ijodtest dir
    try {
        wrench.rmdirSyncRecursive("ijodtest");
    } catch (E) {
        if (E.code != "ENOENT") {
            process.stderr.write("Error: " + E + "\n");
            process.exit(1);
        }
    }
}

// Cleanup the old runs Me dir and then copy the stub in

// If we have args they can be either files or groups
if (process.argv.length > 2) {
    // It's nice to be helpful
    if (process.argv[2] == "-h" || process.argv[2] == "-?") {
        process.stdout.write("Usage: runTests [-l <group name>][-f] [files or groups to run]\n");
        process.stdout.write("  -h  You found me!\n");
        process.stdout.write("  -s  Suppress the output from test running\n");
        process.stdout.write("  -d  Use the dot matrix style reporter\n");
        process.stdout.write("  -nc Disable colors\n");
        process.stdout.write("  -u  Only run the unit tests, skip the front end tests\n");
        process.stdout.write("  -c  Only run the front end tests, skip the unit tests\n");
        process.stdout.write("  -l  List all of the available groups when no group is given or\n");
        process.stdout.write("      all of the files ran in a group.\n");
        process.stdout.write("  -f  The remaining arguments are treated as files to run\n");
        process.stdout.write("  -x  Output tests in xUnit format for CI reporting\n");
        process.stdout.write("\n");
        process.stdout.write("The list of groups are loaded from the Config/config.json and by default all\n");
        process.stdout.write("of them are ran.  A list of the groups to run can be specified as an\n");
        process.stdout.write("argument to the script.  If -f is used the list of arguments are\n");
        process.stdout.write("treated as individual files, not groups.\n");
        process.exit(0);
    }

    if (process.argv[2] == "-l") {
        var testGroups = JSON.parse(fs.readFileSync("Config/config.json")).testGroups;
        if (process.argv.length > 3) {
            if (testGroups.hasOwnProperty(process.argv[3])) {
                process.stdout.write("Files in group " + process.argv[3] + ":\n");
                for (var x = 0; x < testGroups[process.argv[3]].length; ++x) {
                    process.stdout.write("\t" + testGroups[process.argv[3]][x] + "\n");
                }
            } else {
                process.stdout.write(process.argv[3] + " is not a valid group.\n");
                process.exit(0);
            }
        } else {
            process.stdout.write("Available groups:\n");
            for (var key in testGroups) {
                if (testGroups.hasOwnProperty(key)) process.stdout.write("\t" + key + "\n");
            }
        }
        process.exit(0);
    }
    if (process.argv[2] == "-f") {
        // Get the files to run
        runIntegration = false;
        for (var x = 3; x < process.argv.length; ++x) {
            runFiles.push(process.argv[x]);
        }
    } else {
        // We'll process the groups later into indivdual files
        for (var x = 2; x < process.argv.length; ++x) {
            if (process.argv[x][0] != "-") runGroups.push(process.argv[x]);
        }
    }
}

if (process.env["TRAVIS"] == "true") {
    runIntegration = false;
}

// If they have specified any groups or defaulting to all we need to process this
if (runGroups.length > 0 || (runFiles.length === 0 && runGroups.length === 0)) {
    var testGroups = JSON.parse(fs.readFileSync("Config/config.json")).testGroups;
    if (runGroups.length === 0) {
        for (var key in testGroups) {
            if (testGroups.hasOwnProperty(key)) {
                runGroups.push(key);
            }
        }
    }
    runGroups.forEach(function(key) {
        if (testGroups.hasOwnProperty(key)) {
            runFiles = runFiles.concat(testGroups[key]);
        } else {
            process.stderr.write("Invalid test group " + key + ", skipping.\n");
        }
    });
}

if (runFiles.length === 0) {
    process.stderr.write("No tests were specified.\n");
    process.exit(1);
}

try {
    var lockerd = require(__dirname + "/../_lockerd.js");
} catch (E) {
    console.error("Locker did not start correctly, got the error: " + E);
    process.exit(1);
}

var checkLocker = function() {
    if (lockerd.alive === true) {
        runTests();
    } else {
        setTimeout(checkLocker, 1000);
    }
}

checkLocker();

var runTests = function() {
    var xunit = false;
    var vowsArgument = [];//["--supress-stdout"];
    if (process.argv.indexOf("-x") > 0) {
        xunit = true;
        vowsArgument.push('--xunit');
    } else if (process.argv.indexOf("-d") > 0) {
        vowsArgument.push("--dot-matrix");
    } else {
        vowsArgument.push("--spec");
    }
    if (process.argv.indexOf("-u") > 0) {
        runIntegration = false
    }
    if (process.argv.indexOf("-c") > 0) {
        return runRake();
    }
    if (process.argv.indexOf("-s") > 0) {
        // Yes, it's really misspelled this way in vows.
        vowsArgument.push("--supress-stdout");
    }
    if (process.argv.indexOf("-nc") > 0) {
        vowsArgument.push("--nocolor");
    }

    var output = '';
    process.chdir(__dirname);
    var vowsProcess = require("child_process").spawn(__dirname + "/../node_modules/vows/bin/vows", vowsArgument.concat(runFiles));
    vowsProcess.stdout.on("data", function(data) {
        if (xunit) output += data;
        process.stdout.write(data);
    });
    vowsProcess.stderr.on("data", function(data) {
        process.stderr.write(data);
    });
    vowsProcess.on("exit", function(code, signal) {
        if (xunit) {
            output = output.substring(output.indexOf('<testsuite name="Vows test"'));
            output = output.replace(/^\s+|\s+$/g, '');
            fs.writeFileSync('output.xml', output);
        }
        if (code || signal) {
            // unit tests failed
            return finished(code, signal);
        }
        if (runIntegration) {
            runRake();
        } else {
            finished(code, signal);
        }
    });
}

var runRake = function() {
    var rakeProcess = require("child_process").spawn("rake", ["ci:setup:rspec","default"], { cwd: __dirname + "/integration"});
    rakeProcess.stdout.on("data", function(data) {
        process.stdout.write(data);
    });
    rakeProcess.stderr.on("data", function(data) {
        process.stderr.write(data);
    });
    rakeProcess.on("exit", function(code, signal) {
        finished(code, signal);
    });
}

var finished = function(exitCode, signal) {
    if (exitCode > 0) {
        console.dir("vows process exited abnormally (code="+exitCode+", signal="+signal+")");
    }
    lockerd.shutdown(exitCode);
}
