var lconfig = require('../Common/node/lconfig.js');
var assert = require("assert");
var vows = require("vows");


vows.describe("Locker Config").addBatch({
    "Can load config from a file" : {
        topic: lconfig.load('config.json'),
        "loads value for lockerPort as 8043" : function() {
            assert.equal(lconfig.lockerPort, 8043);
            assert.equal(lconfig.displayUnstable, true);
        }
    }
}).export(module);