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
        sync();
    } catch (E) { }
}

function sync() {
    var response = {};
    response.config = { "knownIDs" : [1, 2, 4]};
    response.data = { "testSync" : [ { "obj" : {"notId" : 500, "someData":"BAM"}, "type" : "new", "timestamp" : 1312325283581 } ] };
    response.data.testSync.push({"obj" : {"notId" : 1, "someData":"datas"}, "type" : "new", "timestamp" : 1312325283582 });
    response.data.testSync.push({"obj" : {"notId" : 1}, "type" : "delete", "timestamp" : 1312325283583 });
    process.stdout.write(JSON.stringify(response));
    process.exit();
};