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
    var response = {};
    response.config = { "ids" : { "testSync" : [1, 500]}, "secondRun" : true, nextRun:2424242424242};
    response.data = { "testSync" : [ { "obj" : {"notId" : 500, "someData":"BAM"}, "type" : "new", "timestamp" : 1312325283581 } ] };
    response.data.testSync.push({"obj" : {"notId" : 1, "someData":"datas"}, "type" : "new", "timestamp" : 1312325283582 });
    response.data["eventType/dataStore"] = [ {"obj" : {"id" : 5, "notId": 5, "random" : "data"}, "type" : "new", "timestamp" : 1312325283583 } ];
    if (config.config.secondRun) {
        response.config = { "ids" : { "testSync" : [1, 500]}, "thirdRun" : true};
        response.data = {};
    }
    if (config.config.thirdRun) {
        response.config = { "ids" : { "testSync" : [1]}, "fourthRun" : true };
        response.data = {};
    }
    if (config.config.fourthRun) {
        response.data.testSync = [{"obj" : {"nawtId" : 1}, "timestamp" : 1312325283583 }];
        response.config = { "ids" : { "testSync" : [1]}, "fourthRun" : true};
    }
    process.stdout.write(JSON.stringify(response));
    process.exit();
};