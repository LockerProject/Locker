var fs = require("fs");
var net = require("net");
require.paths.push(__dirname + "/../Common/node");
process.env["NODE_PATH"]=__dirname + "/../Common/node"; // for spawn'd nodelings
var lconfig = require("lconfig");
lconfig.load("Config/config.json");
var lconsole = require("lconsole");
var wrench = require("wrench");

var runFiles = [];
var runGroups = [];

function writeLogLine() {
    fs.writeSync(logFd, "[" + (new Date()).toLocaleString() + "][" + console.outputModule + "] " + Array.prototype.slice.call(arguments).toString() + "\n");
}

// We're going to replace the logging here so we can have it all and show it later
console.log = writeLogLine;
console.warn = writeLogLine;
console.error = writeLogLine;


// Cleanup the old runs Me dir and then copy the stub in
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

// Ladies and gentlemen, get your logs ready
var logFd = fs.openSync("locker.log", "w+");

// If we have args they can be either files or groups
if (process.argv.length > 2) {
    // It's nice to be helpful
    if (process.argv[2] == "-h" || process.argv[2] == "-?") {
        process.stdout.write("Usage: runTests [-l <group name>][-f] [files or groups to run]\n");
        process.stdout.write("  -h  You found me!\n");
        process.stdout.write("  -s  Suppress the output from test running\n");
        process.stdout.write("  -d  Use the dot matrix style reporter\n");
        process.stdout.write("  -nc Disable colors\n");
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
    var lockerd = require(__dirname + "/../lockerd.js");
} catch (E) {
    console.error("Locker did not start correctly, got the error: " + E);
    process.exit(1);
}

setTimeout(function() {
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
    if (process.argv.indexOf("-s") > 0) {
        vowsArgument.push("--supress-stdout");
    }
    if (process.argv.indexOf("-nc") > 0) {
        vowsArgument.push("--nocolor");
    }

    var output = '';

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
        if (code != null) {
            console.log("All tests done");
            lockerd.shutdown(code);
        } else {
            console.dir("vows process exited abnormally (code="+code+", signal="+signal+")");
            lockerd.shutdown(1);
        }
    });
}, 1000);
