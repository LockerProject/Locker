var zlib = require("zlib");
var sys = require("util");
var fs = require("fs");
var lconfig = require(__dirname +"/../Common/node/lconfig");
lconfig.load(__dirname+"/../Config/config.json");
var IJOD = require(__dirname+"/../Common/node/ijod").IJOD;
var async = require("async");
var spawn = require('child_process').spawn;


var enc = null;
var name = process.argv[2];
var id = process.argv[3]||"id";

var sqlite = require('sqlite-fts');

var db = new sqlite.Database();

var mongodb = require("mongodb");

bootMongo()

var ijods = {};
var mongo;
function connect(cb){
    mongo = new mongodb.Db('locker', new mongodb.Server("127.0.0.1", 27018, {}));
    mongo.open(function(err, p_client) {
        if(err) return console.error(err);
        mongo.collectionNames(function(err, names){
            scan(names, lconfig.lockerDir + '/' + lconfig.me, function(){
                console.error("done");
                mongo.close();
                cb();
            });
        });
//      mongo.collection(name, setup);
    })

}

function scan(names, dir, callback) {
    console.error("scanning "+dir);
    var files = fs.readdirSync(dir);
    async.forEachSeries(files, function(file, cb){
        var fullPath = dir + '/' + file;
        var stats = fs.statSync(fullPath);
        if(!stats.isDirectory()) return cb();
        fs.stat(fullPath+"/me.json",function(err,stats){
            if(!stats || !stats.isFile()) return cb();
            var me = JSON.parse(fs.readFileSync(fullPath+"/me.json"));
            if(!me) return cb();
            async.forEachSeries(names, function(nameo, cb2){
                var name = nameo.name;
                var pfix = "locker.asynclets_"+me.id+"_";
                if(name.indexOf(pfix) == -1) return cb2();
                var dname = name.substr(pfix.length);
                console.error(name);
                ijods[name] = new IJOD({name:fullPath+"/"+dname}, function(err, ij){
                    if(err) console.error(err);
                    var id = "id";
                    if(me.mongoId && me.mongoId[dname]) id = me.mongoId[dname];
                    if(me.mongoId && me.mongoId[dname+"s"]) id = me.mongoId[dname+"s"];
                    mongo.collection(name.substr(7), function(err, coll){
                        if(err) console.error(err);
                        eacher(coll, id, ij, cb2);
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
    collection.find().each(function(err, item) {
        if(!item){
            console.error("loaded " + count + " items in "+(Date.now() - at));
            callback();
            return;
        }
        if(!item[id]) console.error("can't find "+id+" in "+JSON.stringify(item));
        ++count;
        ij.addData({id:item[id], data:item}, function(addError) {
            if (addError) {
                console.error("Adding to ijod error: " + addError);
                console.error(addError.stack);
            }
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


