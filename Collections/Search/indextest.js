var index = require('./index.js');
index.init("/tmp/foo.db", function(err){
    console.error(err);
    index.index("place://places/#1234",{"title":"red blue"}, null, function(err){
        console.error(err);
        index.query({q:"idr: place://places/#1234", snippet:true}, console.log, console.log);
    })
})