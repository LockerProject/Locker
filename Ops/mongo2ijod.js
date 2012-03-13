var sys = require("util");
var fs = require("fs");
var lconfig = require(__dirname +"/../Common/node/lconfig");
var IJOD = require(__dirname+"/../Common/node/ijod").IJOD;
var async = require("async");
var spawn = require('child_process').spawn;
var lutil = require("lutil");

var mongodb = require("mongodb");
var mongo;

if (exports) {
  exports.run = function(cb) {
    connect(cb);
  }
}

if(require.main === module) {
  lconfig.load(__dirname+"/../Config/config.json");
  bootMongo()
} else {
  console.log("Running mongo2ijod");
}

function connect(cb){
    mongo = new mongodb.Db('locker', new mongodb.Server("127.0.0.1", 27018, {}));
    mongo.open(function(err, p_client) {
        if(err) return console.error(err);
        mongo.collectionNames(function(err, names){
            scan(names, lconfig.lockerDir + '/' + lconfig.me, function(err){
                console.error("done");
                mongo.close();
                cb(err);
            });
        });
//      mongo.collection(name, setup);
    })

}

function scan(names, dir, callback) {
    console.error("scanning "+dir);
    var files = fs.readdirSync(dir);
    lutil.forEachSeries(files, function(file, cb){
        var fullPath = dir + '/' + file;
        var stats = fs.statSync(fullPath);
        // Skip other files
        if(!stats.isDirectory()) return cb();
        fs.stat(fullPath+"/me.json",function(err,stats){
          // No me.json skip
          if (err) return cb();
            if(!stats || !stats.isFile()) return cb();
            var me = JSON.parse(fs.readFileSync(fullPath+"/me.json"));
            // Skip non service directories
            if(!me) return cb();
            lutil.forEachSeries(names, function(nameo, cb2){
                var name = nameo.name;
                var pfix = "locker.asynclets_"+me.id+"_";
                // Skip invalid synclets
                if(name.indexOf(pfix) == -1) return cb2();
                var dname = name.substr(pfix.length);
                console.error(name);
                var ij = new IJOD({name:fullPath+"/"+dname});
                ij.open(function(err) {
                    if(err) {
                      console.error(err);
                      return cb2(err);
                    }
                    var id = "id";
                    if(me.mongoId && me.mongoId[dname]) id = me.mongoId[dname];
                    if(me.mongoId && me.mongoId[dname+"s"]) id = me.mongoId[dname+"s"];
                    mongo.collection(name.substr(7), function(err, coll){
                        if(err) {
                          console.error(err);
                          return cb2(err);
                        }
                        eacher(coll, id, ij, function(err) {
                          if (err) return cb2(err);
                          ij.close(cb2);
                        });
                    })
                });
            }, cb);
        });
    },callback);
}



function eacher(collection, id, ij, callback) {
  // Locate all the entries using find
  var count = 0;
  var at = Date.now();
  var cursor = collection.find();
  ij.startAddTransaction(function() {
    var item;
    async.until(
      function() { return !item;},
      function(stepCb) {
        cursor.nextObject(function(err, cur) {
          item = cur;
          if (!item) return stepCb();
          if (!item[id]) {
            console.error("can't find "+id+" in "+JSON.stringify(item));
            return stepCb("Could not find " + id);
          }
          ++count;
          ij.smartAdd({id:item[id], data:item}, function(addError) {
            if (addError) {
              console.error("Adding to ijod error: " + addError);
              console.error(addError.stack);
              return callback(addError);
            }
          });
        });
      },
      function(err) {
        if (err) {
          return callback(err);
        }
        ij.commitAddTransaction(callback);
      });
  });
};


function bootMongo()
{
    var mongoProcess = spawn('mongod', ['--dbpath', lconfig.lockerDir + '/' + lconfig.me + '/' + lconfig.mongo.dataDir,
                                    '--port', lconfig.mongo.port]);
    mongoProcess.stderr.on('data', function(data) {
        console.error('mongod err: ' + data);
    });

    var mongoOutput = "";

    // watch for mongo startup
    var callback = function(data) {
        mongoOutput += data.toString();
        console.error(mongoOutput);
        if(mongoOutput.match(/ waiting for connections on port/g)) {
            mongoProcess.stdout.removeListener('data', callback);
            connect(function() {
                mongoProcess.kill();
            });
       }
    };
    mongoProcess.stdout.on('data', callback);

    process.on("uncaughtException", function(E) {
        console.error(E);
        mongoProcess.kill();
        process.exit(1);
    });
}


