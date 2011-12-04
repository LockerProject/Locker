var index = require('./index.js');
var data = require('./data');
var logger = {};
logger.info = console.log;
logger.error = console.error;

index.init("/tmp/foo.db", function(err){
    data.init({lockerBase:"http://localhost:8042"}, index, logger);
//    data.gather(false, false, function(err){
//        console.error(err);
        index.query({q:process.argv[2], snippet:true, sort:true}, console.log, console.log);
//    });
//    console.error(err);
//    index.index("place://places/#1234",{"title":"red blue"}, null, function(err){
//        console.error(err);
//        index.query({q:"idr: place://places/#1234", snippet:true, sort:true}, console.log, console.log);
//    })
})
