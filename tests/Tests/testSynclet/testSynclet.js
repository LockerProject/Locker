/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var config = "";

process.stdin.setEncoding('utf8');
process.stdin.on("data", function(data) {
    config += data;
    processConfig();
});

process.stdin.resume();

function processConfig() {
    try {
        config = JSON.parse(config);
        sync(config);
    } catch (E) { }
}

function sync(config) {
    var response = {data: {}};
    if (!config.config || !config.config.runNumber) {
        response.config = { "ids" : { "testSync" : [1, 500]}, "runNumber" : 1};
        response.data.testSync = [ { "obj" : {"notId" : 500, "someData":"BAM"}, "type" : "new", "timestamp" : 1312325283581 },
                                   {"obj" : {"notId" : 1, "someData":"datas"}, "type" : "new", "timestamp" : 1312325283582 }];
        response.data["dataStore"] = [ {"obj" : {"id" : 5, "notId": 5, "random" : "data"}, "type" : "new", "timestamp" : 1312325283583 } ];
    } else if (config.config.runNumber == 1) {
        response.config = {"runNumber" : 2, nextRun:(Date.now() - 1)};
    } else if (config.config.runNumber == 2) {
        response.config = { "ids" : { "testSync" : [1, 500]}, "runNumber" : 3};
    } else if (config.config.runNumber == 3) {
        response.config = { "ids" : { "testSync" : [1]}, "runNumber" : 4 };
    } else if (config.config.runNumber == 4) {
        response.data = {testSync : [{"obj" : {"nawtId" : 1}, "timestamp" : 1312325283583 }]};
        response.config = { "ids" : { "testSync" : [1]}};
    }
    process.stdout.write(JSON.stringify(response));
    process.exit();
};