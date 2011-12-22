var gzbz2 = require("gzbz2");
var sys = require("sys");
var fs = require("fs");
var lconfig = require(__dirname +"/../Common/node/lconfig");
lconfig.load(__dirname+"/../Config/config.json");

// Create gzip stream
var gzip = new gzbz2.Gzip;

var enc = null;
var name = process.argv[2];
var id = process.argv[3]||"id";

var sqlite = require('sqlite-fts');

var db = new sqlite.Database();

var mongodb = require("mongodb");

var mongo;
function connect(){
    var mongo = new mongodb.Db('locker', new mongodb.Server("127.0.0.1", 27018, {}));
    mongo.open(function(err, p_client) {
        if(err) return console.error(err);
//      mongo.collection(name, setup);
    })

}

// open the database for reading if file exists
// create new database file if not

function setup(err, collection){
    db.open(name+".db", function (error) {
      if (error) {
          console.log("Tonight. You.");
          throw error;
      }
      db.executeScript("CREATE TABLE IF NOT EXISTS tab (id TEXT PRIMARY KEY, at INTEGER, len INTEGER);",function (error) {
            if (error) throw error;
            eacher(collection);
          });
    });

}

function eacher(collection) {
    // Locate all the entries using find
    var arr = [];
    var at = Date.now();
    collection.find().each(function(err, item) {
        if(!item){
            console.error("loaded "+arr.length+" items in "+(Date.now() - at));
            saver(arr);
            return client.close();
        }
        arr.push(item);
    });
};

var async = require("async");
function saver(arr)
{
    var start = Date.now();
    var datas = [];
    var len = 0;
    async.forEachSeries(arr,function(item,cb){
        gzip.init();
        var gzdata = gzip.deflate(new Buffer(JSON.stringify(item)+"\n"), enc);  // Do this as many times as required
    //    sys.puts("Compressed chunk size : " + gzdata.length);
        datas.push(gzdata);
        var gzlast = gzip.end();
    //    sys.puts("Compressed chunk size: " + gzlast.length);
        datas.push(gzlast);
        var at = len;
        len += gzdata.length;
        len += gzlast.length;
        var sql = "INSERT INTO tab VALUES (?, ?, ?)";
        db.execute(sql, [item[id], at, len-at], function(err){
            cb();
        });
    },function(){
        console.error("indexed in "+(Date.now()-start));
        start = Date.now();
        var fd = fs.openSync(name+".json.gz", "w", 0644);
        datas.forEach(function(gzdata){
            fs.writeSync(fd, gzdata, 0, gzdata.length, null);
        })
        fs.closeSync(fd);
        console.error("written in "+(Date.now()-start));

    })

}

function bootMongo()
{
    var mongoProcess = spawn('mongod', ['--dbpath', lconfig.lockerDir + '/' + lconfig.me + '/' + lconfig.mongo.dataDir,
                                    '--port', lconfig.mongo.port]);
    mongoProcess.stderr.on('data', function(data) {
        logger.error('mongod err: ' + data);
    });

    var mongoOutput = "";

    // watch for mongo startup
    var callback = function(data) {
        mongoOutput += data;
        if(mongoOutput.match(/ waiting for connections on port/g)) {
            mongoProcess.stdout.removeListener('data', callback);
            connect();
       }
    };
    mongoProcess.stdout.on('data', callback);
}


