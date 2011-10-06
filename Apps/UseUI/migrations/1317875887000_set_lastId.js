var async = require("async");

module.exports = function(dir) {
    process.chdir(dir);
    var path = require('path');
    var fs = require('fs');

    var state = JSON.parse(fs.readFileSync(path.join("./".dir,"state.json")));
    console.log("Pre state:" + JSON.stringify(state));

    var lmongo = require(__dirname + '/../../../Common/node/lmongo.js');

    async.forEachSeries([["photos", "photos", "photo"], ["contacts", "contacts", "contact/full"], ["links", "link", "link"]], function(item, cb) {
        if (state[item[2]].lastId) return cb();
        lmongo.init(item[0], [item[1]], function(mongo) {
            var coll = mongo.collections[item[0]][item[1]];
            coll.count(function(err, count) {
                console.log("Count of " + item[1] + " was " + count);
                var limitCount = count - state[item[2]].count;
                coll.find().sort({_id:-1}).skip(limitCount).limit(1).nextObject(function(err, obj) {
                    if(err || !obj) return cb()
                    state[item[2]].lastId = obj._id.toHexString();
                    cb();
                })
            })
        });
    }, function() {
        fs.writeFileSync(path.join("./",dir,"state.json"), JSON.stringify(state));
    });
    return true;
};