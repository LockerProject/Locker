var index = require('./index.js');
index.init("/tmp/foo.db", function(err){
    console.error(err);
    index.index("place://places/#1234",{"title":"red blue"}, function(err){
        console.error(err);
        index.query({q:"red"}, console.log, console.log);
    })
})