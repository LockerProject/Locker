var request = require("request");
var async = require("async");
var fs = require("fs");
var path = require("path");

var connectors = {
  "twitter":["friends", "timeline", "tweets"],
  "facebook":["home", "photos", "friends"],
  "github":["repos", "users"]
};

var host = process.argv.length > 2 ? process.argv[2] : "localhost";
console.log("Gathering from %s", host);

function runIt() {
  async.forEachSeries(Object.keys(connectors), function(key, cb) {
    async.forEachSeries(connectors[key], function(synclet, syncletCb) {
      var totalData = "";
      var fname = path.join("verification", key + "-" + synclet + ((process.argv.length > 3 && process.argv[3] == "ijod") ? "-ijod" : "") + ".json");
      console.log("Opening %s", fname);
      try {
        if (fs.statSync(fname)) fs.unlinkSync(fname);
      } catch(E) {
      }
      var req = request({url:("http://" + host + ":8042/synclets/" + key + "/getCurrent/" + synclet + "?stream=true")});
      req.pipe(fs.createWriteStream(fname));
      req.on("end", function() {
        console.log("Run for %s/%s done", key, synclet);
        syncletCb();
      });
    }, function(syncletErr) {
      console.log("Connector %s done", key);
      cb();
    });
  }, function(err) {
    console.log("Connectors done");
  });
}

fs.stat("verification", function(err, stat) {
  if (err) fs.mkdirSync("verification");
  runIt();
});

